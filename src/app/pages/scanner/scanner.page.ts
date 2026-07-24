import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { addIcons } from 'ionicons';
import {
  addOutline,
  cameraOutline,
  closeOutline,
} from 'ionicons/icons';

interface PaginaEscaneada {
  id: number;
  dataUrl: string;
}

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonThumbnail,
    IonTitle,
    IonToolbar,
  ],
})
export class ScannerPage {
  paginas: PaginaEscaneada[] = [];

  constructor() {
    addIcons({
      addOutline,
      cameraOutline,
      closeOutline,
    });
  }

  async tomarFoto(): Promise<void> {
    try {
      const foto = await Camera.getPhoto({
        quality: 90,
        correctOrientation: true,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (!foto.dataUrl) {
        return;
      }

      this.paginas.push({
        id: Date.now(),
        dataUrl: foto.dataUrl,
      });
    } catch (error) {
      console.error('No se pudo tomar la fotografía:', error);
    }
  }

  eliminarFoto(id: number): void {
    this.paginas = this.paginas.filter(
      (pagina) => pagina.id !== id,
    );
  }
}