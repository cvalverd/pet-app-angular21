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

## Docker

```bash
docker build -t pet-app .
docker run -p 4000:4000 pet-app
```

Abre `http://localhost:4000`. La imagen compila la app y la sirve con el servidor de Angular (Express)
en el puerto 4000. La URL de la API (`apiUrl` en `pet.service.ts`) queda fija al compilar: si la API
no corre en `http://localhost:8080`, cámbiala antes de construir la imagen y agrega el origen del
frontend (por ejemplo `http://localhost:4000`) en `CORS_ORIGINS` del microservicio.
