import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { Login } from './auth/login/login';
import { Signup } from './auth/signup/signup';
import { BrowseSchool } from './browsing/browse-school/browse-school';
import { BrowsingSchools } from './browsing/browsing-schools/browsing-schools';
import { StudentDashboard } from './student-platform/student-dashboard/student-dashboard';
import { RegisterSchool } from './auth/register-school/register-school';
import { AdminSchool } from './admin-school/admin-school/admin-school';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { PlatformAdmin } from './platform/platform-admin/platform-admin';

export const routes: Routes = [
	{
		path: '',
		component: LandingPage,
		title: 'DrivEase - Platform'
	},
	{
		path: 'browse',
		component: BrowsingSchools,
		title: 'DrivEase - Driving Schools'
	},
	{
		path: 'browse/:id',
		component: BrowseSchool
	},
	
	{
		path: 'login',
		component: Login,
		title: 'DrivEase - Login'
	},
	{
		path: 'signup',
		component: Signup,
		title: 'DrivEase - SignUp'
	},
	{
		path: 'student-platform-dashboard',
		component: StudentDashboard,
		canActivate: [authGuard, roleGuard('student')],
		title: 'DrivEase - Student Dashboard',
	},
	{
		path: 'register-school/:id',
		component: RegisterSchool,
		canActivate: [authGuard, roleGuard('student')],
		title: 'DrivEase - Register School'
	},
	{
		path:'school-admin-dashboard',
		component: AdminSchool,
		canActivate: [authGuard, roleGuard('school_admin')],
		title: 'DrivEase - School Admin'
	},
	{
		path: 'platform-admin',
		component: PlatformAdmin,
		canActivate: [authGuard, roleGuard('platform_admin')],
		title: 'DrivEase - Platform Admin'
	}

	
];
