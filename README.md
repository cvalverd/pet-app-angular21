# pet-app (Angular 21)

Réplica en **Angular 21** del ejemplo del video *DSY2205_Exp2_S3 · Creación de FrontEnd usando Angular*
(Desarrollo FullStack III, semana 3): listado de mascotas y detalle, aplicando MVC y el patrón Observer.
El original se hizo con Angular 17. El código se transcribió de las capturas del video.

## Estructura (igual al video)

```
src/app/
  models/pet.ts                         Modelo Pet (id, name, breed, age)
  services/pet.service.ts               Capa de modelo (MVC): consume la API con HttpClient
  components/pet-list/                  Vista (MVC) + Observer: lista y selección de mascota
  components/pet-details/               Vista (MVC): detalle de la mascota elegida
  app.routes.ts                         Controlador (MVC): rutas '', 'list' y 'pet'
```

## Qué cambió respecto del video (lo que Angular 21 exige o deja obsoleto)

| Video (Angular 17) | Angular 21 |
|---|---|
| `HttpClientModule` en cada componente | `provideHttpClient(withFetch())` una sola vez en `app.config.ts` |
| `standalone: true`, `CommonModule` | Standalone por defecto; ya no se importa `CommonModule` |
| `*ngFor` / `*ngIf` y un `ng-template #noData` sin usar | `@for` / `@if`; el "No hay datos disponibles." ahora se muestra con `@empty` |
| `pets!: Pet[]` y `pet!: Pet` | `signal(...)`: Angular 21 es *zoneless* y sin signal la vista no se actualiza al llegar la respuesta |
| `router.getCurrentNavigation()` | `router.currentNavigation()` (el anterior quedó obsoleto) |
| SSR con prerender | SSR activo, pero las rutas se renderizan en el navegador (`app.routes.server.ts`): dependen de la API y del `state` de la navegación |
| `app.component.*` | `app.ts` / `app.html` (nombres nuevos del CLI); `app.html` solo tiene `<router-outlet />` |

Se mantuvieron los nombres del video (`PetListComponent`, `PetDetailsComponent`, `pet-list.component.ts`...),
el paso del id por `state.idpet` y `providers: [PetService]`. En el detalle se agregó un resguardo
para cuando se entra directo a `/pet` sin elegir mascota.

## Ejecutar

Requiere **Node 20.19+ o 22.12+**.

```bash
npm install
npm start          # http://localhost:4200
```

El backend es el microservicio **pet-api** (`C:\dev\pet-api-oracle`, Spring Boot + Oracle Cloud).
`apiUrl` en `src/app/services/pet.service.ts` apunta a `http://localhost:8080/pets`; si la API se
despliega en otro lugar (por ejemplo una EC2), cambia esa URL y agrega el origen del frontend en
`CORS_ORIGINS` del microservicio.

### Publicar la imagen en Amazon ECR con AWS Academy

El workflow `.github/workflows/publish-ecr.yml` construye la imagen Docker y la publica en ECR con
el SHA del commit como tag en un runner alojado por GitHub. No requiere Docker, AWS CLI ni un runner
en tu PC; usa credenciales temporales de AWS Academy almacenadas como GitHub Actions Secrets.

Requisitos:

1. Inicia el laboratorio AWS Academy y agrega estos secretos del repositorio en **Settings →
   Secrets and variables → Actions → New repository secret**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN`
2. Usa los valores temporales de la sesión Academy activa. Cuando roten o venzan, actualiza los tres
   secretos antes de volver a ejecutar el workflow.
3. Las credenciales deben permitir crear el repositorio ECR `pet-app-angular21` si aún no existe,
   describirlo, autenticarse en ECR y subir imágenes. El workflow lo crea con tags inmutables y
   cifrado AES256 cuando es necesario.
4. Ejecuta **Publish container to Amazon ECR** desde la pestaña **Actions**, o actualiza la rama
   `main` mientras los secretos contienen credenciales vigentes.

No pegues credenciales AWS en el código ni en el chat. Las credenciales vencidas o una política que
deniegue ECR harán fallar el workflow. Este workflow solo publica la imagen en ECR, no crea ni
actualiza recursos ECS. La aplicación actualmente fija la API en `http://localhost:8080/pets`, por
lo que las llamadas a la API no funcionarán para visitantes hasta configurar la URL del backend.

El workflow manual **Check ECS deployment prerequisites** hace una comprobación de solo lectura de
la imagen, el clúster ECS, los roles de tarea y la red; no crea recursos.

El workflow manual **Prepare Amazon ECS resources** crea el clúster Fargate, un grupo de logs con
retención de 7 días si aún no existe y registra la task definition usando el `LabRole` de Academy.
No inicia tareas ni publica el servicio mientras falte dominio/certificado HTTPS.

## Docker

```bash
docker build -t pet-app .
docker run -p 4000:4000 pet-app
```

Abre `http://localhost:4000`. La imagen compila la app y la sirve con el servidor de Angular (Express)
en el puerto 4000. La URL de la API (`apiUrl` en `pet.service.ts`) queda fija al compilar: si la API
no corre en `http://localhost:8080`, cámbiala antes de construir la imagen y agrega el origen del
frontend (por ejemplo `http://localhost:4000`) en `CORS_ORIGINS` del microservicio.
