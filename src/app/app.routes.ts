import { Routes } from '@angular/router';
import { PetListComponent } from './components/pet-list/pet-list.component';
import { PetDetailsComponent } from './components/pet-details/pet-details.component';

export const routes: Routes = [
  { path: 'list', component: PetListComponent },
  { path: 'pet', component: PetDetailsComponent },
  //con este path se indica cual es la primera pagina que se debe iniciar junto con la app
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];
