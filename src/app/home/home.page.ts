import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  cardOutline,
  documentTextOutline,
  folderOpenOutline,
  imagesOutline,
  personOutline,
  readerOutline,
  shapesOutline,
} from 'ionicons/icons';

interface Herramienta {
  nombre: string;
  icono: string;
  ruta: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSearchbar,
  ],
})
export class HomePage {
  busqueda = '';

  herramientas: Herramienta[] = [
    {
      nombre: 'Escanear',
      icono: 'camera-outline',
      ruta: '/scanner',
    },
    {
      nombre: 'PDF',
      icono: 'document-text-outline',
      ruta: '/pdf-tools',
    },
    {
      nombre: 'Imágenes',
      icono: 'images-outline',
      ruta: '/images',
    },
    {
      nombre: 'Archivos',
      icono: 'folder-open-outline',
      ruta: '/files',
    },
    {
      nombre: 'Credencial',
      icono: 'card-outline',
      ruta: '/id-card',
    },
    {
      nombre: 'Extraer texto',
      icono: 'reader-outline',
      ruta: '/ocr',
    },
    {
      nombre: 'Foto ID',
      icono: 'person-outline',
      ruta: '/id-photo',
    },
    {
      nombre: 'Todas',
      icono: 'shapes-outline',
      ruta: '/all-tools',
    },
  ];

  herramientasFiltradas: Herramienta[] = [...this.herramientas];

  constructor(private readonly router: Router) {
    addIcons({
      cameraOutline,
      cardOutline,
      documentTextOutline,
      folderOpenOutline,
      imagesOutline,
      personOutline,
      readerOutline,
      shapesOutline,
    });
  }

  filtrarHerramientas(): void {
    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      this.herramientasFiltradas = [...this.herramientas];
      return;
    }

    this.herramientasFiltradas = this.herramientas.filter(
      (herramienta) =>
        herramienta.nombre.toLowerCase().includes(texto),
    );
  }

  async abrirHerramienta(ruta: string): Promise<void> {
    await this.router.navigateByUrl(ruta);
  }
}