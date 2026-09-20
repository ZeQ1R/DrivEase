export interface School {
  id: number;
  name: string;
  image: { src: string; alt: string };
  rating: string;
  price: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  features: { feature1: string; feature2: string; feature3: string };
}