import { Component, OnInit, signal } from '@angular/core';
import { Pet } from '../../models/pet';
import { PetService } from '../../services/pet.service';
import { NavigationExtras, Router } from '@angular/router';

// Angular 21: los componentes son standalone por defecto, HttpClient se registra
// una vez en app.config.ts (provideHttpClient) y la plantilla usa @for en vez de
// *ngFor, asi que ya no se importan HttpClientModule ni CommonModule.
// Ademas Angular 21 es zoneless: los datos que llegan de la API se guardan en un
// signal para que la vista se actualice sola.
@Component({
  selector: 'app-pet-list',
  templateUrl: './pet-list.component.html',
  styleUrl: './pet-list.component.css',
  providers: [PetService]
})
export class PetListComponent implements OnInit {
  pets = signal<Pet[]>([]);
  constructor(private petService: PetService, private router: Router) { }

  ngOnInit() {
    this.getPets();
  }

  //aqui se implementa el patron observer
  getPets() {
    this.petService.getPets().subscribe(pets => {
      this.pets.set(pets);
    });
  }

  onPetSelected(pet: Pet) {
    let navigationExtras: NavigationExtras = {
      state: {
        idpet: pet.id
      }
    }

    this.router.navigate(['pet'], navigationExtras);
  }
}
