# Manual de clase: Angular y Spring Boot en EC2 con Oracle

## Objetivo

Al finalizar tendrás tus propios repositorios en GitHub y una instancia EC2 con el frontend Angular,
la API Spring Boot y una conexión a Oracle Autonomous Database. GitHub Actions construirá las imágenes,
las guardará en ECR y actualizará los contenedores al hacer push a `main`.

**Importante:** la aplicación de demostración funciona en EC2, pero la plantilla para crear una
instancia nueva todavía no se ha probado en un despliegue completo desde cero. Si algún paso falla,
revisa los eventos y registros indicados al final; no asumas que `CREATE_COMPLETE` prueba la aplicación.

La demo usa HTTP público y no tiene autenticación. Usa únicamente datos de prueba. AWS y Oracle pueden
generar cargos: consulta los límites de tu laboratorio y [precios de AWS](https://aws.amazon.com/pricing/).

## 1. Antes de comenzar

Necesitas:

- Una cuenta de GitHub con acceso a GitHub Actions, Git instalado y VS Code con GitHub Copilot.
- Tu laboratorio AWS activo y autenticado en Copilot, con permisos para CloudFormation, EC2, Systems
  Manager, S3, Secrets Manager y ECR. Si usas AWS Academy, comprueba los permisos y límites del lab.
- Acceso a una Oracle Autonomous Database de prueba, un usuario con permisos para crear tablas y su
  wallet. Cada alumno debe usar su propia base o un esquema independiente: el CRUD modifica datos y
  Flyway crea tablas y registros de demostración.
- Una VPC y una subred pública en AWS con salida a Internet y ruta al Internet Gateway. La base Oracle
  debe ser accesible desde la EC2; revisa las restricciones de red de Oracle.

Conectar AWS a Copilot **no configura automáticamente** ni la AWS CLI de la terminal ni los secretos
de GitHub Actions. Este manual usa las consolas para esos pasos. Si utilizas AWS Academy, necesitarás
obtener sus tres credenciales temporales desde la interfaz del laboratorio para configurar Actions.
Si tu autenticación no permite obtener credenciales para Actions, el flujo actual no puede usarse
sin cambiar su método de autenticación.

No escribas contraseñas, tokens ni contenido del wallet en el chat de Copilot, en los repositorios o
en capturas compartidas. Copilot puede ayudarte con consultas y diagnóstico usando los permisos
autorizados; revisa cualquier acción que cree, modifique o elimine recursos antes de aprobarla.

## 2. Crea tus repositorios y clónalos

1. Abre [el frontend](https://github.com/cvalverd/pet-app-angular21) y selecciona **Fork**.
2. Haz lo mismo con [el backend](https://github.com/cvalverd/pet-api-oracle). Los dos forks deben
   quedar en tu cuenta de GitHub, no en la del profesor.
3. En cada fork, abre **Actions** y habilita los workflows si GitHub te lo solicita.
4. Copia la URL HTTPS de cada fork con el botón **Code**. En una terminal, clónalos en la misma carpeta:

   ```powershell
   git clone https://github.com/TU_USUARIO_GITHUB/pet-app-angular21.git
   git clone https://github.com/TU_USUARIO_GITHUB/pet-api-oracle.git
   ```

   Sustituye `TU_USUARIO_GITHUB` y los nombres si cambiaste el nombre de algún fork. Comprueba en cada
   carpeta que `git remote -v` apunta a tu fork. Autentica Git con una cuenta que pueda escribir en él.

No hagas push a `main` hasta completar la configuración: cada push a esa rama dispara un despliegue.

## 3. Prepara Oracle y el wallet

1. En Oracle Cloud, abre tu Autonomous Database de prueba y confirma que está disponible.
2. En **Database connection**, descarga el wallet como ZIP. Conserva el ZIP original en un lugar
   privado de tu equipo; no lo agregues a Git.
3. Abre el ZIP para consultar el archivo `tnsnames.ora`, que debe estar en la raíz del ZIP. Anota
   únicamente el alias de servicio que usarás, por ejemplo `mi_base_tp`; no necesitas copiar el
   contenido del archivo al chat.
4. Ten disponibles el nombre y la contraseña de un usuario de tu esquema de prueba. La API usará
   Flyway al iniciar: crea la tabla `PET` y agrega mascotas de demostración si corresponde. No apuntes
   a un esquema con datos de producción.

El archivo ZIP se subirá a S3 en el paso 6. La plantilla no crea Oracle ni genera su wallet.

## 4. Crea el secreto de Oracle en AWS

En la consola AWS selecciona la región del laboratorio; este ejemplo usa **us-east-1**. Trabaja siempre
en la misma cuenta y región para la EC2, el secreto, S3, ECR y los pipelines.

1. Abre **Secrets Manager → Store a new secret → Other type of secret**.
2. En la vista de pares clave/valor crea estas tres entradas, con tus valores reales:

   | Clave | Valor |
   |---|---|
   | `DB_URL` | Alias del `tnsnames.ora`, por ejemplo `mi_base_tp` |
   | `DB_USERNAME` | Usuario de tu esquema Oracle |
   | `DB_PASSWORD` | Contraseña de ese usuario |

   El secreto debe contener un objeto JSON con esos nombres exactos. El alias usa el wallet que la API
   descarga a `/app/wallet`; no pongas una ruta local de tu computador en `DB_URL`.
3. Completa el asistente con un nombre identificable, por ejemplo `pet-api/oracle-db-credentials`,
   y crea el secreto. Anota su **ARN completo** desde la consola; se usará como identificador, no la
   contraseña. Mantén acceso a ese valor restringido.

## 5. Crea la infraestructura

La plantilla está en el fork del frontend: `ec2/pet-app-ec2-stack.yml`. Crea la EC2, su Security
Group, EBS cifrado y, por defecto, un bucket S3 privado para el wallet. Instala Docker y Nginx en la
instancia. No crea Oracle, la VPC, la subred ni el secreto del paso anterior.

1. En la consola AWS, identifica la **VPC** y una **subred pública** de esa VPC. Una subred pública
   necesita una ruta activa al Internet Gateway; confirma también la salida a Internet.
2. Abre **CloudFormation → Create stack → With new resources**.
3. Selecciona **Upload a template file** y carga
   `pet-app-angular21/ec2/pet-app-ec2-stack.yml` desde el clon del frontend.
4. Indica un nombre, por ejemplo `pet-app-ec2-demo`, y completa:

   | Parámetro | Valor |
   |---|---|
   | `VpcId` | ID de tu VPC |
   | `PublicSubnetId` | ID de tu subred pública |
   | `OracleCredentialsSecretArn` | ARN del secreto creado en el paso 4 |
   | `OracleWalletObjectKey` | `Wallet.zip` |
   | `OracleWalletBucketName` | Déjalo vacío para crear un bucket. Si proporcionas uno existente, tú administras su seguridad y permisos. |
   | `InstanceType` | `t3.medium` por defecto; verifica que tu laboratorio lo permita |
   | `CreateInstanceRole` | `false` en AWS Academy; `true` para crear el rol en una cuenta propia con permisos IAM |
   | `ExistingInstanceProfileName` | `LabInstanceProfile` en AWS Academy, si existe en tu laboratorio |
   | `AllowedHttpCidr` | `0.0.0.0/0` para esta demo pública |

   El perfil existente debe permitir SSM, lectura de ECR, del secreto y del objeto S3. Si eliges crear
   el rol, CloudFormation solicitará autorización para crear recursos IAM. Si restringes el CIDR HTTP,
   tanto tus clientes como los runners de GitHub deben poder llegar al puerto 80 para que pasen los
   smoke tests. Para un entorno real usa HTTPS, autenticación y restricciones de acceso adecuadas.
5. Revisa las opciones y crea el stack. Espera a **CREATE_COMPLETE**. Si falla, consulta la pestaña
   **Events** del stack y el primer error, por ejemplo falta de permisos o cuota.
6. En **Outputs**, anota `InstanceId`, `WalletBucketName`, `WalletObjectKey` y `WebsiteUrl`.
7. Abre **Systems Manager → Fleet Manager → Managed nodes** y confirma que la instancia aparezca
   **Online**. Espera también a que termine su inicialización; estar Online por sí solo no confirma
   que Docker y Nginx estén listos.

**Copilot, opcional:** puedes pedirle que identifique la VPC y subredes candidatas, revise el estado
del stack y compruebe si la instancia está Online. Confirma la cuenta y región y revisa sus acciones.

## 6. Sube el wallet al bucket

1. Abre **S3 → Buckets** y busca el `WalletBucketName` de los outputs.
2. Selecciona **Upload** y carga el ZIP original del wallet.
3. Comprueba que la clave del objeto coincida exactamente con `WalletObjectKey`, por ejemplo
   `Wallet.zip`. Si el archivo descargado tiene otro nombre, renómbralo localmente antes de subirlo
   o utiliza ese nombre como parámetro al crear el stack.
4. Confirma que el bucket sea privado. El bucket generado por la plantilla bloquea acceso público,
   cifra los objetos, exige HTTPS y conserva versiones.

No subas el wallet a GitHub ni lo agregues a la imagen Docker.

## 7. Configura GitHub Actions en ambos forks

Los secretos y variables **no se copian al hacer fork**. Repite esta configuración en cada uno de tus
dos repositorios: **Settings → Secrets and variables → Actions**.

### Secrets: en frontend y backend

En la pestaña **Secrets**, crea con **New repository secret**:

| Nombre | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` | Access key de tu sesión temporal AWS |
| `AWS_SECRET_ACCESS_KEY` | Secret key de la misma sesión |
| `AWS_SESSION_TOKEN` | Session token de la misma sesión |

En AWS Academy obtén los tres valores desde los detalles del laboratorio y cópialos directamente al
formulario de GitHub, sin pegarlos en Copilot. Deben corresponder a la misma sesión y cuenta. Cuando
expiren, actualiza **los tres secretos en ambos repositorios** antes de ejecutar los workflows.

### Variables: en frontend y backend

En la pestaña **Variables**, crea:

| Nombre | Valor |
|---|---|
| `AWS_REGION` | `us-east-1`, o la región elegida para todos tus recursos |
| `EC2_INSTANCE_ID` | `InstanceId` del stack |

En el frontend también puedes configurar `AWS_ACCOUNT_ID` con el ID de tu cuenta para comprobar que
las credenciales apunten a ella.

### Variables adicionales: solo en backend

| Nombre | Valor |
|---|---|
| `ORACLE_CREDENTIALS_SECRET_ARN` | ARN completo del secreto del paso 4 |
| `ORACLE_WALLET_S3_BUCKET` | `WalletBucketName` del stack |
| `ORACLE_WALLET_S3_KEY` | `WalletObjectKey`, igual a la clave subida a S3 |

Antes de continuar, verifica que los tres secretos están en **ambos** forks y que las variables del
backend apuntan a tus recursos, no a los del profesor. El usuario AWS de Actions debe poder usar ECR,
enviar y consultar comandos SSM y consultar la instancia EC2. El perfil de la EC2 necesita leer las
imágenes, el secreto y el wallet.

## 8. Primer despliegue: backend y luego frontend

1. En tu fork **backend**, abre **Actions → Test, publish and deploy API to EC2 → Run workflow**.
   Selecciona la rama `main` y ejecuta el workflow.
2. Espera a que termine en verde. El job ejecuta los tests Maven, crea `pet-api-oracle` en ECR si no
   existe, publica la imagen y despliega la API por SSM. El smoke test consulta `/pets` y espera al
   menos cuatro registros.
3. En tu fork **frontend**, abre **Actions → Publish and deploy frontend to EC2 → Run workflow**.
   Selecciona `main` y ejecútalo.
4. Espera a que termine en verde. El job crea `pet-app-angular21` en ECR si no existe, publica y
   despliega la imagen, y comprueba la web y la API.
5. Abre el job **Deploy frontend to EC2 through Systems Manager** y busca `Website: http://...`.
   Esa es la dirección pública actual. La IP puede cambiar cuando se detiene y vuelve a iniciar la EC2;
   consulta la IP actual en EC2 o la salida del último despliegue exitoso.

No ejecutes el workflow legacy **Deploy Pet API to ECS**: no actualiza la instancia EC2.

## 9. Verifica la aplicación y el CRUD

1. Abre la dirección de `Website` en el navegador. Debes ver la interfaz **huellitas** y las mascotas.
2. Abre `http://TU_IP_PUBLICA/pets`: debe responder una lista JSON. En una base nueva se esperan las
   mascotas de demostración; los pipelines requieren al menos cuatro registros.
3. Crea una mascota de prueba desde la interfaz, edítala y elimínala. Confirma que desaparece. Hazlo
   solo en tu esquema de prueba y no elimines registros de otros alumnos.
4. Si necesitas apoyo, pide a Copilot que revise el resultado del workflow, el estado del nodo SSM y
   los mensajes de error, sin incluir secretos ni el contenido del wallet.

## 10. Demuestra el flujo automático

1. Abre uno de tus clones en VS Code y realiza un cambio pequeño en ese proyecto.
2. Revisa los archivos con `git status` y `git diff`. No incluyas wallets, `.env`, contraseñas ni
   credenciales. Comprueba que la rama es `main` con `git branch --show-current`.
3. Haz commit y push a tu propio fork:

   ```powershell
   git add RUTA_DEL_ARCHIVO_CAMBIADO
   git commit -m "Cambio de demostración"
   git push origin main
   ```

4. Abre **Actions** en ese fork, espera la ejecución y revisa los jobs. El workflow de ese repositorio
   construye y despliega su componente; el otro componente no se despliega por ese push.
5. Actualiza la página o consulta `/pets`, según el cambio realizado. Si falla, no supongas que se
   desplegó: abre el job fallido y lee el error.

## 11. Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| `NoCredentials` en la terminal | La conexión AWS de Copilot no garantiza una sesión para AWS CLI. Usa la consola o configura la CLI con tu sesión autorizada; no pegues claves en el chat. |
| `403` al hacer push | Confirma que `origin` apunta a tu fork y que Git usa una cuenta con escritura. |
| Workflow sin permisos o credenciales inválidas | Habilita Actions en el fork; revisa los tres secrets y si la sesión temporal expiró. |
| `AccessDenied` en AWS | Comprueba cuenta, región, permisos del laboratorio y del perfil EC2. No amplíes permisos sin autorización. |
| Instancia no aparece Online en SSM | Comprueba que está encendida, su perfil, salida a Internet y agente SSM. |
| Stack completo pero despliegue falla | Revisa la inicialización de la instancia, Docker, Nginx y el primer error de SSM o CloudFormation. |
| Error de wallet o conexión Oracle | Verifica bucket/clave, permiso `s3:GetObject`, ZIP original con `tnsnames.ora` en su raíz, alias, secreto y acceso de red a Oracle. |
| Smoke test con menos de cuatro registros | El pipeline exige al menos cuatro mascotas en `/pets`. Revisa Flyway y el esquema de prueba; no modifiques datos ajenos. |
| La web dejó de abrir después de reiniciar | Consulta la IP pública actual y la red de la instancia; sin Elastic IP la dirección puede cambiar. |

## 12. Al terminar la clase

Si ya no necesitas tus recursos, revisa su propietario y elimina **solo tus recursos**:

1. Desde CloudFormation elimina tu stack y espera a que termine. Esto elimina la EC2 y su EBS.
2. El bucket generado y sus versiones se **retienen**; la política HTTPS del stack se elimina. Si
   conservarás el bucket, restaura esa política. Si ya no lo necesitas, elimina manualmente sus
   versiones y luego el bucket, siguiendo las indicaciones de la consola S3.
3. El stack no elimina tus repositorios ECR, el secreto de Secrets Manager ni Oracle. Revisa si aún
   los necesitas y sus políticas de eliminación antes de retirarlos. No elimines recursos compartidos.
4. Comprueba los costos y el estado de tu laboratorio. Al volver a usarlo, actualiza las credenciales
   temporales en GitHub si han expirado.
