import { RenderMode, ServerRoute } from '@angular/ssr';

// Se renderiza en el navegador: la lista y el detalle dependen de la API del
// microservicio y el detalle recibe el id por el state de la navegacion, que no
// existe al prerenderizar en el servidor.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
