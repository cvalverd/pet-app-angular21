import { Component, OnInit, signal } from '@angular/core';
import { Pet } from '../../models/pet';
import { PetService } from '../../services/pet.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-pet-details',
  templateUrl: './pet-details.component.html',
  styleUrl: './pet-details.component.css',
  providers: [PetService]
})
export class PetDetailsComponent implements OnInit {
  pet = signal<Pet | undefined>(undefined);
  id!: number;

  constructor(private activatedRoute: ActivatedRoute, private petService: PetService, private router: Router) {
    this.activatedRoute.queryParams.subscribe(param => {
      // Angular 21: router.currentNavigation() reemplaza a getCurrentNavigation(), que quedo obsoleto.
      if (this.router.currentNavigation()?.extras.state) {
        this.id = this.router.currentNavigation()?.extras?.state?.['idpet'];
      }
    })
  }

  ngOnInit() {
    this.getPetDetails();
  }

  getPetDetails() {
    if (this.id == null) return; // se entro directo a /pet, sin elegir una mascota
    this.petService.getPetDetails(this.id).subscribe(pet => {
      this.pet.set(pet);
    });
  }

}
