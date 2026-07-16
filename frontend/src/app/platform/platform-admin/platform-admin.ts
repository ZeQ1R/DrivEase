import { Component,inject,signal,OnInit, DestroyRef } from '@angular/core';
import { School } from '../../schools/school.model';
import { SchoolsService } from '../../schools/schools.service';
import { NavBar } from "../../shared/nav-bar/nav-bar";
import { LaneDivider } from "../../shared/lane-divider/lane-divider";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmBox } from '../../shared/confirm-box/confirm-box';
import { ToastService } from '../../shared/toast/toast.service';


@Component({
  selector: 'app-platform-admin',
  imports: [NavBar, LaneDivider, FormsModule, ReactiveFormsModule,ConfirmBox],
  templateUrl: './platform-admin.html',
  styleUrl: './platform-admin.css',
})
export class PlatformAdmin implements OnInit{

  private schoolsService = inject(SchoolsService)
  private toast = inject(ToastService)
  schools = signal<School[]>([])
  formOpen = signal(false)
  editingSchool = signal<School | null>(null)
  formError = signal('')
  saving = signal(false)

  selectedImage: File | null = null

  confirmMessage = signal('')
  pendingAction: (() => void) | null = null

  form = new FormGroup({
  name: new FormControl('', { validators: [Validators.required] }),
  city: new FormControl('', { validators: [Validators.required] }),
  address: new FormControl('', { validators: [Validators.required] }),
  description: new FormControl('', { validators: [Validators.required] }),
  price: new FormControl('', { validators: [Validators.required] }),
  rating: new FormControl('', { validators: [Validators.required] }),
  transmission: new FormControl('', { validators: [Validators.required] }),
  instructors_count: new FormControl('', { validators: [Validators.required] }),
  pass_rate: new FormControl('', { validators: [Validators.required] }),
  phone: new FormControl('', { validators: [Validators.required] }),
  email: new FormControl('', { validators: [Validators.required] }),
});

  ngOnInit(){
    this.schoolsService.getSchools().subscribe({
      next: (res) => {
        this.schools.set(res.schools)
      },
      error: (err) => console.error('Failed to load schools', err)
    })
  }
  openCreateForm(){
    this.editingSchool.set(null)
    this.form.reset()
    this.selectedImage = null
    this.formOpen.set(true)
  }

  openEditForm(school: School){
    this.editingSchool.set(school)
    this.form.patchValue(
      {name: school.name, 
        city: school.city, 
        address: school.address, 
        description: school.description, 
        price: String(school.price), 
        rating: String(school.rating), 
        phone: school.phone, 
        email: school.email,
      })
    this.formOpen.set(true)
  }

  closeForm(){
    this.formOpen.set(false)
    this.formError.set('')
  }

  onImageSelected(event: Event){
    const input = event.target as HTMLInputElement
    this.selectedImage = input.files?.[0] ?? null
  }

  askConfirm(msg: string, action: () => void){
    this.confirmMessage.set(msg)
    this.pendingAction = action
  }

  onConfirmYes(){
    this.pendingAction?.()
    this.confirmMessage.set('')
    this.pendingAction = null
  }
  onConfirmNo(){
    this.confirmMessage.set('')
    this.pendingAction = null

  }

  onSubmitForm(){

    if(this.form.invalid){
      this.form.markAllAsTouched()
      this.formError.set('Please fill out all required fields.')
      return  
    }
    this.formError.set('')
    this.saving.set(true)

    console.log('form valid?', this.form.valid);
  console.log('invalid controls:', Object.keys(this.form.controls).filter(k => this.form.get(k)?.invalid));

    const data = new FormData();
    data.append('name', this.form.value.name!);
    data.append('city', this.form.value.city!);
    data.append('address', this.form.value.address!);
    data.append('description', this.form.value.description!);
    data.append('price', this.form.value.price!);
    data.append('rating', this.form.value.rating!);
    data.append('transmission', this.form.value.transmission!);
    data.append('instructors_count', this.form.value.instructors_count!);
    data.append('pass_rate', this.form.value.pass_rate!);
    data.append('phone', this.form.value.phone!);
    data.append('email', this.form.value.email!);
    if (this.selectedImage) {
      data.append('image', this.selectedImage);
    }

    const editing = this.editingSchool()

    const request = editing
    ? this.schoolsService.updateSchool(editing.id,data)
    : this.schoolsService.createSchool(data)

    request.subscribe({
      next: () => {
        this.saving.set(false)
        this.closeForm()
        this.ngOnInit()
      },
      error: (err) => {
        this.saving.set(false)
        this.formError.set(err.error?.message || 'Failed to save school. Please try again.')
      }

    })
  }

  onDelete(school: School){
    this.schoolsService.deleteSchool(school.id).subscribe({
      next: () => {
        this.schools.set(this.schools().filter((s) => s.id !== school.id))
        this.toast.success(`“${school.name}” has been deleted.`)
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete the school. Please try again.')
      }
    })
  }
}
