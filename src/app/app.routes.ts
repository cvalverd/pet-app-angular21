import { Routes } from '@angular/router';
import { PetListComponent } from './components/pet-list/pet-list.component';
import { PetDetailsComponent } from './components/pet-details/pet-details.component';

export const routes: Routes = [
  { path: 'list', component: PetListComponent },
  { path: 'pet/:id', component: PetDetailsComponent },
  { path: 'pet', redirectTo: 'list' },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];
