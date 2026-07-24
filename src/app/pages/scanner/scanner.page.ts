import { CommonModule } from '@angular/common';

import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';

import { Capacitor } from '@capacitor/core';

import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem';

import { Share } from '@capacitor/share';
import { PDFDocument } from 'pdf-lib';

import Cropper from 'cropperjs';

import { addIcons } from 'ionicons';

import {
  addOutline,
  cameraOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  copyOutline,
  cropOutline,
  documentOutline,
  downloadOutline,
  imageOutline,
  refreshOutline,
  returnUpForwardOutline,
  shareOutline,
  trashOutline,
} from 'ionicons/icons';

interface PaginaEscaneada {
  id: number;
  dataUrl: string;
  originalDataUrl: string;
}

type FiltroImagen =
  | 'original'
  | 'documento'
  | 'grises'
  | 'blanco-negro'
  | 'claro'
  | 'oscuro';

type FormatoExportacion =
  | 'pdf'
  | 'jpg'
  | 'png';


interface AjustesImagen {
  rotacion?: number;
  brillo?: number;
  contraste?: number;
  escalaGrises?: number;
  blancoNegro?: boolean;
}

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class ScannerPage
  implements AfterViewChecked, OnDestroy {

  @ViewChild('imagenEditor')
  imagenEditor?: ElementRef<HTMLImageElement>;

  paginas: PaginaEscaneada[] = [];

  paginaSeleccionadaId: number | null = null;

  procesandoEdicion = false;
  modoRecorte = false;

  brillo = 100;
  contraste = 100;
  escalaGrises = 0;

  formatoExportacion: FormatoExportacion = 'pdf';
  exportando = false;
  mensajeExportacion = '';

  private cropper?: Cropper;
  private cropperPendiente = false;

  constructor(
    private readonly router: Router,
  ) {
    addIcons({
      addOutline,
      cameraOutline,
      chevronDownOutline,
      chevronUpOutline,
      closeOutline,
      copyOutline,
      cropOutline,
      documentOutline,
      downloadOutline,
      imageOutline,
      refreshOutline,
      returnUpForwardOutline,
      shareOutline,
      trashOutline,
    });
  }

  ngAfterViewChecked(): void {
    if (
      !this.modoRecorte ||
      !this.cropperPendiente
    ) {
      return;
    }

    const imagen =
      this.imagenEditor?.nativeElement;

    if (!imagen) {
      return;
    }

    this.cropperPendiente = false;
    this.inicializarCropper(imagen);
  }

  ngOnDestroy(): void {
    this.destruirCropper();
  }

  async tomarFoto(): Promise<void> {
    try {
      const foto = await Camera.getPhoto({
        quality: 92,
        correctOrientation: true,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (!foto.dataUrl) {
        return;
      }

      const id = Date.now();

      this.paginas.push({
        id,
        dataUrl: foto.dataUrl,
        originalDataUrl: foto.dataUrl,
      });

      this.seleccionarPagina(id);
    } catch (error) {
      console.error(
        'No se pudo obtener la fotografía:',
        error,
      );
    }
  }

  seleccionarPagina(id: number): void {
    this.destruirCropper();

    this.modoRecorte = false;
    this.cropperPendiente = false;
    this.paginaSeleccionadaId = id;

    this.reiniciarControles();
  }

  cerrarEditor(): void {
    this.destruirCropper();

    this.modoRecorte = false;
    this.cropperPendiente = false;
    this.paginaSeleccionadaId = null;

    this.reiniciarControles();
  }

  obtenerPaginaSeleccionada():
    PaginaEscaneada | undefined {
    return this.paginas.find(
      (pagina) =>
        pagina.id ===
        this.paginaSeleccionadaId,
    );
  }

  activarRecorte(): void {
    if (
      !this.obtenerPaginaSeleccionada() ||
      this.procesandoEdicion
    ) {
      return;
    }

    this.destruirCropper();

    this.modoRecorte = true;
    this.cropperPendiente = true;
  }

  cancelarRecorte(): void {
    this.destruirCropper();

    this.cropperPendiente = false;
    this.modoRecorte = false;
  }

  aplicarRecorteInteractivo(): void {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      !this.cropper ||
      this.procesandoEdicion
    ) {
      return;
    }

    this.procesandoEdicion = true;

    try {
      const canvas =
        this.cropper.getCroppedCanvas({
          maxWidth: 4096,
          maxHeight: 4096,
          fillColor: '#ffffff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        });

      if (!canvas) {
        throw new Error(
          'No se pudo generar el recorte.',
        );
      }

      pagina.dataUrl = canvas.toDataURL(
        'image/jpeg',
        0.95,
      );

      this.destruirCropper();

      this.cropperPendiente = false;
      this.modoRecorte = false;
    } catch (error) {
      console.error(
        'No se pudo aplicar el recorte:',
        error,
      );
    } finally {
      this.procesandoEdicion = false;
    }
  }

  girarRecorte(): void {
    if (!this.cropper) {
      return;
    }

    this.cropper.rotate(90);
  }

  eliminarFoto(id: number): void {
    this.paginas = this.paginas.filter(
      (pagina) => pagina.id !== id,
    );

    if (this.paginaSeleccionadaId === id) {
      this.cerrarEditor();
    }
  }

  eliminarTodas(): void {
    this.paginas = [];
    this.cerrarEditor();
  }

  duplicarPagina(id: number): void {
    const indice = this.paginas.findIndex(
      (pagina) => pagina.id === id,
    );

    if (indice === -1) {
      return;
    }

    const original = this.paginas[indice];
    const nuevoId = Date.now();

    const copia: PaginaEscaneada = {
      id: nuevoId,
      dataUrl: original.dataUrl,
      originalDataUrl:
        original.originalDataUrl,
    };

    this.paginas.splice(
      indice + 1,
      0,
      copia,
    );

    this.seleccionarPagina(nuevoId);
  }

  subirPagina(indice: number): void {
    if (indice <= 0) {
      return;
    }

    [
      this.paginas[indice - 1],
      this.paginas[indice],
    ] = [
      this.paginas[indice],
      this.paginas[indice - 1],
    ];
  }

  bajarPagina(indice: number): void {
    if (
      indice >=
      this.paginas.length - 1
    ) {
      return;
    }

    [
      this.paginas[indice + 1],
      this.paginas[indice],
    ] = [
      this.paginas[indice],
      this.paginas[indice + 1],
    ];
  }

  async girarPagina(): Promise<void> {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    await this.aplicarTransformacion(
      pagina,
      {
        rotacion: 90,
      },
    );
  }

  async aplicarFiltro(
    filtro: FiltroImagen,
  ): Promise<void> {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    if (filtro === 'original') {
      this.restaurarPagina();
      return;
    }

    const ajustes: Record<
      Exclude<FiltroImagen, 'original'>,
      AjustesImagen
    > = {
      documento: {
        brillo: 108,
        contraste: 145,
        escalaGrises: 10,
      },
      grises: {
        escalaGrises: 100,
        contraste: 110,
      },
      'blanco-negro': {
        blancoNegro: true,
      },
      claro: {
        brillo: 125,
        contraste: 108,
      },
      oscuro: {
        brillo: 78,
        contraste: 125,
      },
    };

    await this.aplicarTransformacion(
      pagina,
      ajustes[filtro],
    );
  }

  async guardarAjustes(): Promise<void> {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    await this.aplicarTransformacion(
      pagina,
      {
        brillo: this.brillo,
        contraste: this.contraste,
        escalaGrises: this.escalaGrises,
      },
    );

    this.reiniciarAjustesVisuales();
  }

  restaurarPagina(): void {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (!pagina) {
      return;
    }

    pagina.dataUrl =
      pagina.originalDataUrl;

    this.cancelarRecorte();
    this.reiniciarControles();
  }

  async continuarAPdf(): Promise<void> {
    if (this.paginas.length === 0) {
      return;
    }

    this.cancelarRecorte();

    await this.router.navigateByUrl(
      '/pdf-tools',
      {
        state: {
          paginas: this.paginas.map(
            (pagina) => pagina.dataUrl,
          ),
        },
      },
    );
  }

  private inicializarCropper(
    imagen: HTMLImageElement,
  ): void {
    this.destruirCropper();

    const crearCropper = (): void => {
      if (!this.modoRecorte) {
        return;
      }

      this.cropper = new Cropper(
        imagen,
        {
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,

          responsive: true,
          restore: false,
          checkCrossOrigin: false,
          checkOrientation: true,

          modal: true,
          guides: true,
          center: true,
          highlight: true,
          background: false,

          movable: true,
          rotatable: true,
          scalable: false,

          zoomable: true,
          zoomOnTouch: true,
          zoomOnWheel: true,
          wheelZoomRatio: 0.1,

          cropBoxMovable: true,
          cropBoxResizable: true,

          toggleDragModeOnDblclick: false,
        },
      );
    };

    if (
      imagen.complete &&
      imagen.naturalWidth > 0
    ) {
      crearCropper();
      return;
    }

    imagen.onload = crearCropper;
  }

  private destruirCropper(): void {
    this.cropper?.destroy();
    this.cropper = undefined;
  }

  async descargarEscaneo(): Promise<void> {
    await this.exportarEscaneo(false);
  }

  async compartirEscaneo(): Promise<void> {
    await this.exportarEscaneo(true);
  }

  private async exportarEscaneo(
    compartir: boolean,
  ): Promise<void> {
    if (
      this.paginas.length === 0 ||
      this.exportando
    ) {
      return;
    }

    this.cancelarRecorte();
    this.exportando = true;
    this.mensajeExportacion = '';

    try {
      if (this.formatoExportacion === 'pdf') {
        const bytesPdf =
          await this.crearPdfEscaneado();

        const nombreArchivo =
          `escaneo_${Date.now()}.pdf`;

        await this.entregarArchivoPdf(
          bytesPdf,
          nombreArchivo,
          compartir,
        );

        return;
      }

      await this.exportarPaginasComoImagenes(
        this.formatoExportacion,
        compartir,
      );
    } catch (error) {
      console.error(
        'No se pudo exportar el escaneo:',
        error,
      );

      this.mensajeExportacion =
        'No se pudo exportar el documento.';
    } finally {
      this.exportando = false;
    }
  }

  private async crearPdfEscaneado():
    Promise<Uint8Array> {
    const documento =
      await PDFDocument.create();

    documento.setTitle('Documento escaneado');
    documento.setCreator('ScanDocsSF');
    documento.setProducer('ScanDocsSF');

    for (const pagina of this.paginas) {
      const dataUrlJpeg =
        await this.convertirFormatoImagen(
          pagina.dataUrl,
          'jpg',
        );

      const imagen =
        await documento.embedJpg(
          dataUrlJpeg,
        );

      const paginaPdf =
        documento.addPage([
          imagen.width,
          imagen.height,
        ]);

      paginaPdf.drawImage(imagen, {
        x: 0,
        y: 0,
        width: imagen.width,
        height: imagen.height,
      });
    }

    return documento.save({
      useObjectStreams: true,
    });
  }

  private async entregarArchivoPdf(
    bytesPdf: Uint8Array,
    nombreArchivo: string,
    compartir: boolean,
  ): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const uri =
        await this.guardarArchivoNativo(
          nombreArchivo,
          this.bytesABase64(bytesPdf),
          compartir
            ? Directory.Cache
            : Directory.Documents,
        );

      if (compartir) {
        await Share.share({
          title: 'Documento escaneado',
          text: 'Documento creado con ScanDocsSF',
          files: [uri],
          dialogTitle: 'Compartir PDF',
        });

        this.mensajeExportacion =
          'PDF preparado para compartir.';
      } else {
        this.mensajeExportacion =
          'PDF guardado en los documentos de la aplicación.';
      }

      return;
    }

    if (compartir) {
      await this.compartirArchivoEnNavegador(
        bytesPdf,
        nombreArchivo,
        'application/pdf',
      );

      return;
    }

    this.descargarBytesEnNavegador(
      bytesPdf,
      nombreArchivo,
      'application/pdf',
    );

    this.mensajeExportacion =
      'PDF descargado correctamente.';
  }

  private async exportarPaginasComoImagenes(
    formato: 'jpg' | 'png',
    compartir: boolean,
  ): Promise<void> {
    const archivosNativos: string[] = [];
    const archivosWeb: File[] = [];

    for (
      let indice = 0;
      indice < this.paginas.length;
      indice++
    ) {
      const pagina = this.paginas[indice];

      const dataUrl =
        await this.convertirFormatoImagen(
          pagina.dataUrl,
          formato,
        );

      const nombreArchivo =
        `pagina_${indice + 1}.${formato}`;

      const tipoMime =
        formato === 'png'
          ? 'image/png'
          : 'image/jpeg';

      if (Capacitor.isNativePlatform()) {
        const uri =
          await this.guardarArchivoNativo(
            nombreArchivo,
            dataUrl.split(',')[1],
            compartir
              ? Directory.Cache
              : Directory.Documents,
          );

        archivosNativos.push(uri);
        continue;
      }

      if (compartir) {
        archivosWeb.push(
          this.dataUrlAArchivo(
            dataUrl,
            nombreArchivo,
            tipoMime,
          ),
        );
      } else {
        this.descargarDataUrl(
          dataUrl,
          nombreArchivo,
        );
      }
    }

    if (Capacitor.isNativePlatform()) {
      if (compartir) {
        await Share.share({
          title:
            `Escaneo en ${formato.toUpperCase()}`,
          text:
            'Imágenes creadas con ScanDocsSF',
          files: archivosNativos,
          dialogTitle:
            'Compartir imágenes',
        });

        this.mensajeExportacion =
          'Imágenes preparadas para compartir.';
      } else {
        this.mensajeExportacion =
          this.paginas.length === 1
            ? 'Imagen guardada correctamente.'
            : `${this.paginas.length} imágenes guardadas.`;
      }

      return;
    }

    if (compartir) {
      await this.compartirArchivosWeb(
        archivosWeb,
      );

      return;
    }

    this.mensajeExportacion =
      this.paginas.length === 1
        ? 'Imagen descargada correctamente.'
        : `${this.paginas.length} imágenes descargadas.`;
  }

  private convertirFormatoImagen(
    dataUrl: string,
    formato: 'jpg' | 'png',
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const imagen = new Image();

        imagen.onload = () => {
          const canvas =
            document.createElement('canvas');

          canvas.width =
            imagen.naturalWidth;

          canvas.height =
            imagen.naturalHeight;

          const contexto =
            canvas.getContext('2d');

          if (!contexto) {
            reject(
              new Error(
                'No se pudo crear el lienzo.',
              ),
            );
            return;
          }

          if (formato === 'jpg') {
            contexto.fillStyle =
              '#ffffff';

            contexto.fillRect(
              0,
              0,
              canvas.width,
              canvas.height,
            );
          }

          contexto.drawImage(
            imagen,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          const tipoMime =
            formato === 'png'
              ? 'image/png'
              : 'image/jpeg';

          resolve(
            canvas.toDataURL(
              tipoMime,
              0.95,
            ),
          );
        };

        imagen.onerror = () => {
          reject(
            new Error(
              'No se pudo procesar la imagen.',
            ),
          );
        };

        imagen.src = dataUrl;
      },
    );
  }

  private async guardarArchivoNativo(
    nombreArchivo: string,
    base64: string,
    directorio: Directory,
  ): Promise<string> {
    const resultado =
      await Filesystem.writeFile({
        path: nombreArchivo,
        data: base64,
        directory: directorio,
        recursive: true,
      });

    return resultado.uri;
  }

  private async compartirArchivoEnNavegador(
    bytes: Uint8Array,
    nombreArchivo: string,
    tipoMime: string,
  ): Promise<void> {
    const blob = new Blob(
      [bytes as BlobPart],
      {
        type: tipoMime,
      },
    );

    const archivo =
      new File(
        [blob],
        nombreArchivo,
        {
          type: tipoMime,
        },
      );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [archivo],
      })
    ) {
      await navigator.share({
        title: 'Documento escaneado',
        files: [archivo],
      });

      this.mensajeExportacion =
        'Archivo compartido correctamente.';
      return;
    }

    this.descargarBytesEnNavegador(
      bytes,
      nombreArchivo,
      tipoMime,
    );

    this.mensajeExportacion =
      'El navegador no permite compartir archivos; se descargó el documento.';
  }

  private async compartirArchivosWeb(
    archivos: File[],
  ): Promise<void> {
    if (
      navigator.share &&
      archivos.length > 0 &&
      navigator.canShare?.({
        files: archivos,
      })
    ) {
      await navigator.share({
        title: 'Escaneo',
        files: archivos,
      });

      this.mensajeExportacion =
        'Imágenes compartidas correctamente.';
      return;
    }

    for (const archivo of archivos) {
      const url =
        URL.createObjectURL(archivo);

      this.descargarUrl(
        url,
        archivo.name,
      );

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    this.mensajeExportacion =
      'El navegador no permite compartir varios archivos; se descargaron las imágenes.';
  }

  private dataUrlAArchivo(
    dataUrl: string,
    nombreArchivo: string,
    tipoMime: string,
  ): File {
    const partes = dataUrl.split(',');
    const binario = atob(partes[1]);

    const bytes =
      new Uint8Array(
        binario.length,
      );

    for (
      let indice = 0;
      indice < binario.length;
      indice++
    ) {
      bytes[indice] =
        binario.charCodeAt(indice);
    }

    return new File(
      [bytes],
      nombreArchivo,
      {
        type: tipoMime,
      },
    );
  }

  private descargarDataUrl(
    dataUrl: string,
    nombreArchivo: string,
  ): void {
    this.descargarUrl(
      dataUrl,
      nombreArchivo,
    );
  }

  private descargarBytesEnNavegador(
    bytes: Uint8Array,
    nombreArchivo: string,
    tipoMime: string,
  ): void {
    const blob = new Blob(
      [bytes as BlobPart],
      {
        type: tipoMime,
      },
    );

    const url =
      URL.createObjectURL(blob);

    this.descargarUrl(
      url,
      nombreArchivo,
    );

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  private descargarUrl(
    url: string,
    nombreArchivo: string,
  ): void {
    const enlace =
      document.createElement('a');

    enlace.href = url;
    enlace.download = nombreArchivo;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  private bytesABase64(
    bytes: Uint8Array,
  ): string {
    let binario = '';
    const tamanoBloque = 8192;

    for (
      let inicio = 0;
      inicio < bytes.length;
      inicio += tamanoBloque
    ) {
      const bloque =
        bytes.subarray(
          inicio,
          inicio + tamanoBloque,
        );

      binario +=
        String.fromCharCode(...bloque);
    }

    return btoa(binario);
  }

  private async aplicarTransformacion(
    pagina: PaginaEscaneada,
    ajustes: AjustesImagen,
  ): Promise<void> {
    this.procesandoEdicion = true;

    try {
      pagina.dataUrl =
        await this.transformarImagen(
          pagina.dataUrl,
          ajustes,
        );
    } catch (error) {
      console.error(
        'No se pudo editar la imagen:',
        error,
      );
    } finally {
      this.procesandoEdicion = false;
    }
  }

  private transformarImagen(
    dataUrl: string,
    ajustes: AjustesImagen,
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const imagen = new Image();

        imagen.onload = () => {
          const anchoImagen =
            imagen.naturalWidth;

          const altoImagen =
            imagen.naturalHeight;

          const rotacion =
            (
              (
                ajustes.rotacion ?? 0
              ) %
                360 +
              360
            ) %
            360;

          const intercambiar =
            rotacion === 90 ||
            rotacion === 270;

          const canvas =
            document.createElement(
              'canvas',
            );

          canvas.width = intercambiar
            ? altoImagen
            : anchoImagen;

          canvas.height = intercambiar
            ? anchoImagen
            : altoImagen;

          const contexto =
            canvas.getContext(
              '2d',
              {
                willReadFrequently: true,
              },
            );

          if (!contexto) {
            reject(
              new Error(
                'No se pudo crear el editor.',
              ),
            );
            return;
          }

          contexto.save();

          contexto.translate(
            canvas.width / 2,
            canvas.height / 2,
          );

          contexto.rotate(
            rotacion *
              Math.PI /
              180,
          );

          contexto.filter = [
            `brightness(${
              ajustes.brillo ?? 100
            }%)`,
            `contrast(${
              ajustes.contraste ?? 100
            }%)`,
            `grayscale(${
              ajustes.escalaGrises ?? 0
            }%)`,
          ].join(' ');

          contexto.drawImage(
            imagen,
            -anchoImagen / 2,
            -altoImagen / 2,
            anchoImagen,
            altoImagen,
          );

          contexto.restore();
          contexto.filter = 'none';

          if (ajustes.blancoNegro) {
            this.convertirABlancoNegro(
              contexto,
              canvas.width,
              canvas.height,
            );
          }

          resolve(
            canvas.toDataURL(
              'image/jpeg',
              0.95,
            ),
          );
        };

        imagen.onerror = () => {
          reject(
            new Error(
              'No se pudo cargar la imagen.',
            ),
          );
        };

        imagen.src = dataUrl;
      },
    );
  }

  private convertirABlancoNegro(
    contexto:
      CanvasRenderingContext2D,
    ancho: number,
    alto: number,
  ): void {
    const imagen =
      contexto.getImageData(
        0,
        0,
        ancho,
        alto,
      );

    for (
      let indice = 0;
      indice < imagen.data.length;
      indice += 4
    ) {
      const gris =
        imagen.data[indice] * 0.299 +
        imagen.data[indice + 1] * 0.587 +
        imagen.data[indice + 2] * 0.114;

      const valor =
        gris >= 155 ? 255 : 0;

      imagen.data[indice] = valor;
      imagen.data[indice + 1] = valor;
      imagen.data[indice + 2] = valor;
    }

    contexto.putImageData(
      imagen,
      0,
      0,
    );
  }

  private reiniciarControles(): void {
    this.reiniciarAjustesVisuales();
  }

  private reiniciarAjustesVisuales(): void {
    this.brillo = 100;
    this.contraste = 100;
    this.escalaGrises = 0;
  }
}