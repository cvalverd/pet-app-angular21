import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Pet, PetInput } from '../../models/pet';
import { PetService } from '../../services/pet.service';

@Component({
  selector: 'app-pet-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './pet-list.component.html',
})
export class PetListComponent implements OnInit {
  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly error = signal('');
  readonly search = signal('');
  readonly isFormOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly filteredPets = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    if (!query) return this.pets();
    return this.pets().filter(pet =>
      `${pet.name} ${pet.breed}`.toLocaleLowerCase().includes(query)
    );
  });

  draft: PetInput = this.emptyDraft();

  constructor(
    private readonly petService: PetService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadPets();
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'pet-form') {
        this.openCreateForm();
        setTimeout(() => document.getElementById('pet-form')?.scrollIntoView({ behavior: 'smooth' }));
      }
    });
  }

  loadPets(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.error.set('');
    this.petService.getPets().subscribe({
      next: pets => {
        this.pets.set(pets);
        this.loadFailed.set(false);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(this.errorMessage(error));
        this.loadFailed.set(true);
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.draft = this.emptyDraft();
    this.error.set('');
    this.isFormOpen.set(true);
  }

  openEditForm(pet: Pet): void {
    this.editingId.set(pet.id);
    this.draft = { name: pet.name, breed: pet.breed, age: pet.age };
    this.error.set('');
    this.isFormOpen.set(true);
    setTimeout(() => document.getElementById('pet-form')?.scrollIntoView({ behavior: 'smooth' }));
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.draft = this.emptyDraft();
    if (this.route.snapshot.fragment === 'pet-form') {
      this.router.navigateByUrl('/list', { replaceUrl: true });
    }
  }

  savePet(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const id = this.editingId();
    const pet = {
      name: this.draft.name.trim(),
      breed: this.draft.breed.trim(),
      age: Number(this.draft.age)
    };
    const request = id === null
      ? this.petService.createPet(pet)
      : this.petService.updatePet(id, pet);

    request.subscribe({
      next: savedPet => {
        this.pets.update(pets => id === null
          ? [...pets, savedPet]
          : pets.map(pet => pet.id === id ? savedPet : pet));
        this.saving.set(false);
        this.closeForm();
      },
      error: error => {
        this.error.set(this.errorMessage(error));
        this.saving.set(false);
      }
    });
  }

  deletePet(pet: Pet): void {
    if (this.deletingId() !== null || !window.confirm(`¿Eliminar a ${pet.name}? Esta acción no se puede deshacer.`)) return;
    this.error.set('');
    this.deletingId.set(pet.id);
    this.petService.deletePet(pet.id).subscribe({
      next: () => {
        this.pets.update(pets => pets.filter(item => item.id !== pet.id));
        this.deletingId.set(null);
        if (this.editingId() === pet.id) this.closeForm();
      },
      error: error => {
        this.error.set(this.errorMessage(error));
        this.deletingId.set(null);
      }
    });
  }

  private emptyDraft(): PetInput {
    return { name: '', breed: '', age: 0 };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
      const body = error.error as { message?: string; errors?: Record<string, string> } | null;
      if (body?.message) return body.message;
      if (body?.errors) return Object.values(body.errors).join(' · ');
    }
    return 'Ocurrió un problema. Inténtalo de nuevo en unos momentos.';
  }
}
