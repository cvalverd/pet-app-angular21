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
El frontend consume `/pets` en el mismo origen. `npm start` usa `proxy.conf.json` para reenviar esa
ruta a `http://localhost:8080`; en la nube, configura el proxy web para reenviar `/pets` al contenedor
del backend. Este esquema evita depender del `localhost` del navegador y no requiere CORS entre
contenedores.

### Despliegue reproducible en EC2

El workflow `.github/workflows/publish-ecr.yml` construye la imagen Angular, la publica en ECR con
el SHA del commit como etiqueta inmutable y, al ejecutarse desde `main`, actualiza el contenedor
`pet-frontend` de EC2 mediante AWS Systems Manager (SSM). El despliegue conserva el contenedor
anterior hasta que el nuevo responde correctamente y hace rollback si falla. Repetir un workflow
para el mismo commit reutiliza la imagen existente.

Para obtener ambos proyectos en una carpeta de trabajo:

```powershell
git clone https://github.com/cvalverd/pet-app-angular21.git
git clone https://github.com/cvalverd/pet-api-oracle.git
```

Configura y despliega cada repositorio por separado; el clon local del backend que pueda aparecer
como `.backend-worktree-temp` en el equipo del instructor es solo una copia de trabajo y no forma
parte del repositorio frontend.

#### Crear una instancia nueva

La plantilla [ec2/pet-app-ec2-stack.yml](./ec2/pet-app-ec2-stack.yml) crea una instancia Amazon Linux
2023, Security Group HTTP, almacenamiento EBS cifrado y Nginx; no abre SSH. El host debe quedar en una
subred pública con salida a Internet y registrado como nodo administrado de SSM.

Antes de crearla, prepara fuera de la plantilla:

- Una base Oracle Cloud Autonomous Database accesible desde Internet.
- En AWS Secrets Manager, un secreto JSON con `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`.
- El ZIP del wallet en un bucket S3 privado.
- Una VPC y una subred pública. La plantilla **no crea** la base Oracle, el secreto ni el wallet.

En AWS Academy, usa el instance profile existente `LabInstanceProfile` y
`CreateInstanceRole=false`. En una cuenta AWS propia, puedes elegir `CreateInstanceRole=true` para que
la plantilla cree un rol mínimo con SSM, lectura de las imágenes ECR, el secreto indicado y el objeto
wallet; en ese caso se requiere `CAPABILITY_IAM` y permiso para crear roles. El perfil existente
también debe tener esos permisos. No pegues valores de credenciales en la línea de comandos.

Ejemplo PowerShell (reemplaza los identificadores por los de tu cuenta):

```powershell
$VpcId = "vpc-xxxxxxxx"
$SubnetId = "subnet-xxxxxxxx"
$SecretArn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:pet-api/oracle-db-credentials-xxxxxx"
$WalletBucket = "mi-bucket-privado"
$WalletKey = "Wallet.zip"

aws cloudformation deploy `
  --template-file .\ec2\pet-app-ec2-stack.yml `
  --stack-name pet-app-ec2-demo `
  --region us-east-1 `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
    "VpcId=$VpcId" `
    "PublicSubnetId=$SubnetId" `
    "OracleCredentialsSecretArn=$SecretArn" `
    "OracleWalletBucketName=$WalletBucket" `
    "OracleWalletObjectKey=$WalletKey" `
    "CreateInstanceRole=false" `
    "ExistingInstanceProfileName=LabInstanceProfile"
```

Si necesitas descubrir la VPC/subred por defecto:

```powershell
$VpcId = aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text
$SubnetId = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" "Name=default-for-az,Values=true" --query "Subnets[0].SubnetId" --output text
```

Consulta los outputs `InstanceId` y `WebsiteUrl` del stack y comprueba que la instancia esté `Online`
en Systems Manager antes de ejecutar los workflows. Esta plantilla crea una **instancia nueva**; no
importa ni modifica la EC2 de la demo que ya existe. Puede generar cargos de EC2/EBS. Al terminar el
ejercicio, elimina el stack si ya no necesitas la instancia:

```powershell
aws cloudformation delete-stack --stack-name pet-app-ec2-demo --region us-east-1
```

La eliminación no borra la base Oracle, el secreto ni el bucket/objeto del wallet.

#### Configurar GitHub Actions en ambos repositorios

Los secretos y variables de Actions son independientes en cada repositorio. En ambos, entra a
**Settings → Secrets and variables → Actions** y configura:

**Secrets** (los tres son necesarios y AWS Academy los hace expirar):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`

**Variables**:

- `EC2_INSTANCE_ID`: output `InstanceId` de CloudFormation.
- `AWS_REGION`: región del stack, por ejemplo `us-east-1` (opcional; ese es el valor predeterminado).
- `AWS_ACCOUNT_ID`: opcional; si se configura, el workflow frontend verifica que las credenciales
  apunten a esa cuenta.

En el repositorio backend agrega además las variables `ORACLE_CREDENTIALS_SECRET_ARN`,
`ORACLE_WALLET_S3_BUCKET` y `ORACLE_WALLET_S3_KEY`. No guardes los valores del secreto de Oracle en
GitHub; el workflow los obtiene desde Secrets Manager dentro de EC2.

Las credenciales que usa GitHub Actions necesitan acceso a ECR (describir/crear repositorio, login y
subir imagen), `ssm:SendCommand` y `ssm:GetCommandInvocation` sobre la instancia y el documento
`AWS-RunShellScript`, además de `ec2:DescribeInstances`. El rol de la instancia necesita leer las
imágenes, el secreto y el wallet. El workflow usa solo el `main` para actualizar EC2; ejecutarlo
manualmente desde otra rama no despliega.

Para un stack nuevo, despliega primero el backend y después el frontend desde `main`. El workflow de
cada repositorio publica (o reutiliza) la imagen y valida el endpoint del componente; el backend
además ejecuta las pruebas Maven y la imagen Angular compila la aplicación. Al terminar, revisa
`WebsiteUrl` y `http://<IP-publica>/pets`.

No pegues credenciales AWS en el código o en el chat. Un `git clone` por sí solo no configura AWS ni
GitHub Actions: cada estudiante necesita acceso de escritura al repositorio donde empujará cambios,
su cuenta/recursos y sus propios secretos y variables.

### Arquitectura EC2 de la demo activa

La instancia EC2 ejecuta el frontend Angular en Docker (puerto 4000), la API Java (puerto 8080) y
Nginx como proxy en el puerto 80. Los puertos de los contenedores quedan ligados a `127.0.0.1`;
Nginx envía `/pets` a la API y el resto de rutas al frontend. Se administra por AWS Systems Manager
(SSM), sin SSH público.

La API se conecta a Oracle Cloud Autonomous Database con `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`,
almacenados en Secrets Manager. Descarga el wallet ZIP privado del bucket
`pet-api-oracle-wallet-622519216316-us-east-1-an` (clave `Wallet_BTJOWHCMGWJBQTNV.zip`) usando el
perfil de instancia; no guardes credenciales ni wallet en Git o dentro de la imagen. El esquema
existente se adopta con Flyway y la migración V3 crea `PET` solo si falta y agrega únicamente las
mascotas demo ausentes, sin borrar ni reemplazar registros.

Al hacer push a `main`, los workflows de ambos repositorios despliegan sus respectivas imágenes en
EC2. El despliegue de ECS es separado y no actualiza esta instancia; **no ejecutes Deploy Pet API to
ECS para actualizar EC2**. La instancia activa se creó antes de agregar la plantilla CloudFormation
de ejemplo.

**Es solo para una demo:** el sitio/API usan HTTP sin TLS y no tienen autenticación. No uses datos
reales o sensibles. La exposición pública se limita al puerto 80 del proxy; no publiques directamente
los puertos 4000 ni 8080.

## Docker

```bash
docker build -t pet-app .
docker run -p 4000:4000 pet-app
```

Abre `http://localhost:4000`. La imagen compila la app y la sirve con el servidor de Angular (Express)
en el puerto 4000. Al ejecutarla detrás de un proxy inverso, configura el proxy para enviar `/pets`
al backend y el resto de rutas al frontend. Para desarrollo local, `npm start` ya aplica el proxy
definido en `proxy.conf.json`.
