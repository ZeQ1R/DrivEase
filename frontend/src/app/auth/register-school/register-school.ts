import { Component, inject, OnInit, signal } from '@angular/core';
import { NavBar } from "../../shared/nav-bar/nav-bar";
import { LaneDivider } from "../../shared/lane-divider/lane-divider";
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { School } from '../../schools/school.model';
import { RegistrationService } from '../registration.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SchoolsService } from '../../schools/schools.service';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen/loading-screen';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-register-school',
  imports: [ RouterLink, ReactiveFormsModule],
  templateUrl: './register-school.html',
  styleUrl: './register-school.css',
})
export class RegisterSchool implements OnInit{

  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private schoolsService = inject(SchoolsService)
  private registrationService = inject(RegistrationService)
  private toast = inject(ToastService)

  preferredDate = '';
  preferredTime = '';

  availableTimes = [
    '08:00',
    '10:00',
    '12:00',
    '14:00',
    '16:00',
    '18:00'
  ];

  currentStep = 1;

steps = [
  { number: 1, label: 'Personal Info' },
  { number: 2, label: 'License' },
  { number: 3, label: 'School' },
  { number: 4, label: 'Documents' },
  { number: 5, label: 'Schedule' },
  { number: 6, label: 'Review' },
];

nextStep() {
  const fieldsByStep: Record<number, string[]> = {
    1: [
      'firstName',
      'lastName',
      'phone',
      'dateOfBirth',
      'address'
    ],
    2: ['licenseCategory'],
    4: ['embg']
  };

  const fields = fieldsByStep[this.currentStep] ?? [];

  fields.forEach(field => {
    this.form.get(field)?.markAsTouched();
  });

  if (fields.some(field => this.form.get(field)?.invalid)) {
    return;
  }

  if (this.currentStep === 4 && !this.selectedFile) {
    this.registerError = 'Please upload your ID document.';
    return;
  }

  this.registerError = '';

  if (this.currentStep < 6) {
    this.currentStep++;
  }
}

previousStep() {
  this.registerError = '';

  if (this.currentStep > 1) {
    this.currentStep--;
  }
}


  school = signal<School | null>(null)
  registerError = ''
  registering = false
  selectedFile: File | null = null
  submitting = signal(false)


  form = new FormGroup({
    firstName: new FormControl('',{
      validators: [Validators.required]
    }),
    lastName: new FormControl('',{
      validators: [Validators.required]
    }),
    email: new FormControl('',{
      validators: [Validators.required, Validators.email]
    }),
    phone: new FormControl('',{
      validators: [Validators.required]
    }),
    dateOfBirth: new FormControl('',{
      validators: [Validators.required,this.minimumAgeValidator(18)]
    }),
    address: new FormControl('',{
      validators: [Validators.required]
    }),
    postalCode: new FormControl('',{
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(4)]
    }),
    licenseCategory: new FormControl('', {
      validators: [Validators.required]
    }),
    embg: new FormControl('', {
      validators: [Validators.required, Validators.minLength(13), Validators.maxLength(13)]
    }),
  })

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'))
    this.submitting.set(true)
    this.schoolsService.getSchoolById(id).subscribe({
      next: (school) => {
        this.school.set(school)
        this.submitting.set(false)
      },
      error: (err) => {
        console.error('Failed to load school', err)
        this.submitting.set(false)
      }
    })
  }

  get schoolId() {
    return this.school()?.id ?? 0
  }

  get schoolName(){
    return this.school()?.name ?? '...'
  }


  onFileSelected(event:Event){
    const input = event.target as HTMLInputElement
    if(input.files && input.files[0]){
      this.selectedFile = input.files[0]
    }
  }

  isInvalid(field: string){
    const control = this.form.get(field)
    return control?.invalid && control?.touched
  }

  minimumAgeValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const dob = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= minAge ? null : { underage: true };
    };
  }

  onRegister() {

    console.log("SUBMIT CLICKED")
    this.form.markAllAsTouched();

    console.log('Form valid : ', this.form.valid)
    console.log('Form values : ', this.form.value)

    if (this.form.invalid) return;




    const currentSchool = this.school();
    if (!currentSchool) return;

    console.log('school : ' ,currentSchool)
    this.registerError = '';
    this.registering = true;

    const data = new FormData()
      data.append('schoolId', String(currentSchool.id));
      data.append('firstName', this.form.value.firstName!);
      data.append('lastName', this.form.value.lastName!);
      data.append('email', this.form.value.email!);
      data.append('phone', this.form.value.phone!);
      data.append('address', this.form.value.address!);
      data.append('postalCode', this.form.value.postalCode!);
      data.append('embg', this.form.value.embg!);
      data.append('dateOfBirth', this.form.value.dateOfBirth!);
      data.append('licenseCategory', this.form.value.licenseCategory!)
    if (this.selectedFile) {
      data.append('idDocument', this.selectedFile);
    }

    this.registrationService.registerToSchool(data).subscribe({
  next: (response) => {
    console.log('Registration successful:', response);

    this.registering = false;

    this.toast.success(
      'Registration submitted! Track your status on your dashboard.',
      6000
    );

    this.router.navigate(['/student-platform-dashboard'])
      .then(success => {
        console.log('Navigation success:', success);
      })
      .catch(error => {
        console.error('Navigation error:', error);
      });
  },

  error: (err) => {
    this.registering = false;

    this.registerError =
      err.error?.message || 'Failed to register. Please try again.';

    this.toast.error(this.registerError);
  },
});
  }
}
