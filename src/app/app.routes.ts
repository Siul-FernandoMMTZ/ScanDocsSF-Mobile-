import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then(
        (module) => module.HomePage,
      ),
  },
  {
    path: 'scanner',
    loadComponent: () =>
      import('./pages/scanner/scanner.page').then(
        (module) => module.ScannerPage,
      ),
  },
  {
    path: 'pdf-tools',
    loadComponent: () =>
      import('./pages/pdf-tools/pdf-tools.page').then(
        (module) => module.PdfToolsPage,
      ),
  },
  {
    path: 'images',
    loadComponent: () =>
      import('./pages/images/images.page').then(
        (module) => module.ImagesPage,
      ),
  },
  {
    path: 'files',
    loadComponent: () =>
      import('./pages/files/files.page').then(
        (module) => module.FilesPage,
      ),
  },
  {
    path: 'id-card',
    loadComponent: () =>
      import('./pages/id-card/id-card.page').then(
        (module) => module.IdCardPage,
      ),
  },
  {
    path: 'ocr',
    loadComponent: () =>
      import('./pages/ocr/ocr.page').then(
        (module) => module.OcrPage,
      ),
  },
  {
    path: 'id-photo',
    loadComponent: () =>
      import('./pages/id-photo/id-photo.page').then(
        (module) => module.IdPhotoPage,
      ),
  },
  {
    path: 'all-tools',
    loadComponent: () =>
      import('./pages/all-tools/all-tools.page').then(
        (module) => module.AllToolsPage,
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];