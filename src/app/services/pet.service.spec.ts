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
});
