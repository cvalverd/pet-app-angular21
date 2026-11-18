export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
}

export type PetInput = Omit<Pet, 'id'>;
