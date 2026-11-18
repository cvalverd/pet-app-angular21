import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Pet } from '../../models/pet';
import { PetService } from '../../services/pet.service';

@Component({
  selector: 'app-pet-details',
  imports: [RouterLink],
  templateUrl: './pet-details.component.html',
  styleUrl: './pet-details.component.css'
})
export class PetDetailsComponent implements OnInit {
  readonly pet = signal<Pet | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly petService: PetService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id < 1) {
        this.error.set('No encontramos una mascota con ese identificador.');
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      this.error.set('');
      this.petService.getPetDetails(id).subscribe({
        next: pet => {
          this.pet.set(pet);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(this.errorMessage(error));
          this.loading.set(false);
        }
      });
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) return 'Esta mascota ya no está en la lista.';
      if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    return 'No pudimos cargar el perfil. Inténtalo de nuevo en unos momentos.';
  }
}
