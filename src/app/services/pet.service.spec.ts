import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PetService } from './pet.service';

describe('PetService', () => {
  let service: PetService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PetService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('gets the pet list through the same-origin API path', () => {
    const pets = [{ id: 1, name: 'Luna', breed: 'Labrador', age: 3 }];
    let response: typeof pets | undefined;

    service.getPets().subscribe(value => response = value);

    const request = httpTestingController.expectOne('/pets');
    expect(request.request.method).toBe('GET');
    request.flush(pets);
    expect(response).toEqual(pets);
  });

  it('gets pet details through the same-origin API path', () => {
    const pet = { id: 7, name: 'Milo', breed: 'Beagle', age: 2 };
    let response: typeof pet | undefined;

    service.getPetDetails(pet.id).subscribe(value => response = value);

    const request = httpTestingController.expectOne('/pets/7');
    expect(request.request.method).toBe('GET');
    request.flush(pet);
    expect(response).toEqual(pet);
  });

  it('creates a pet using the API contract', () => {
    const pet = { name: 'Nina', breed: 'Poodle', age: 4 };
    let response: unknown;

    service.createPet(pet).subscribe(value => response = value);

    const request = httpTestingController.expectOne('/pets');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(pet);
    request.flush({ id: 8, ...pet });
    expect(response).toEqual({ id: 8, ...pet });
  });

  it('updates a pet using its API resource path', () => {
    const pet = { name: 'Nina', breed: 'Poodle', age: 5 };
    let response: unknown;

    service.updatePet(8, pet).subscribe(value => response = value);

    const request = httpTestingController.expectOne('/pets/8');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(pet);
    request.flush({ id: 8, ...pet });
    expect(response).toEqual({ id: 8, ...pet });
  });

  it('deletes a pet using its API resource path', () => {
    let completed = false;

    service.deletePet(8).subscribe(() => completed = true);

    const request = httpTestingController.expectOne('/pets/8');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(completed).toBe(true);
  });
});
