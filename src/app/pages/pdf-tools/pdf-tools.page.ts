import { CommonModule } from '@angular/common';

import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  GlobalWorkerOptions,
  getDocument,
} from 'pdfjs-dist';

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { Capacitor } from '@capacitor/core';

import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem';

import { Share } from '@capacitor/share';

import {
  PDFDocument,
  PDFImage,
} from 'pdf-lib';

import Cropper from 'cropperjs';

import { addIcons } from 'ionicons';

import {
  arrowDownOutline,
  arrowUpOutline,
  closeOutline,
  cropOutline,
  documentOutline,
  downloadOutline,
  refreshOutline,
  returnUpForwardOutline,
  shareOutline,
  trashOutline,
} from 'ionicons/icons';


GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();


type TamanoHoja =
  | 'automatico'
  | 'a4'
  | 'carta';

type Orientacion =
  | 'automatica'
  | 'vertical'
  | 'horizontal';

type FiltroSeleccionado =
  | 'ninguno'
  | 'documento'
  | 'grises'
  | 'blanco-negro'
  | 'claro'
  | 'oscuro';


interface PaginaPdf {
  id: number;
  dataUrl: string;
  originalDataUrl: string;
  nombre: string;
}


interface DimensionesPagina {
  ancho: number;
  alto: number;
}


interface AjustesImagen {
  rotacion?: number;
  brillo?: number;
  contraste?: number;
  escalaGrises?: number;
  blancoNegro?: boolean;
}


@Component({
  selector: 'app-pdf-tools',
  templateUrl: './pdf-tools.page.html',
  styleUrls: ['./pdf-tools.page.scss'],
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
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class PdfToolsPage
  implements AfterViewChecked, OnDestroy {

  @ViewChild('imagenEditorPdf')
  imagenEditorPdf?: ElementRef<HTMLImageElement>;


  paginas: PaginaPdf[] = [];

  nombreDocumento = 'Documento escaneado';

  tamanoHoja: TamanoHoja = 'a4';
  orientacion: Orientacion = 'automatica';

  calidad = 90;
  margen = 20;

  generando = false;
  importando = false;

  mensaje = '';
  mensajeError = '';


  /* Editor */

  paginaSeleccionadaId: number | null = null;

  modoRecorte = false;
  procesandoEdicion = false;

  brillo = 100;
  contraste = 100;
  escalaGrises = 0;

  filtroSeleccionado:
    FiltroSeleccionado = 'ninguno';

  private cropperPdf?: Cropper;
  private cropperPendientePdf = false;


  constructor() {
    addIcons({
      arrowDownOutline,
      arrowUpOutline,
      closeOutline,
      cropOutline,
      documentOutline,
      downloadOutline,
      refreshOutline,
      returnUpForwardOutline,
      shareOutline,
      trashOutline,
    });

    this.cargarPaginasRecibidas();
  }


  ngAfterViewChecked(): void {
    if (
      !this.modoRecorte ||
      !this.cropperPendientePdf
    ) {
      return;
    }

    const imagen =
      this.imagenEditorPdf?.nativeElement;

    if (!imagen) {
      return;
    }

    this.cropperPendientePdf = false;

    this.inicializarCropperPdf(imagen);
  }


  ngOnDestroy(): void {
    this.destruirCropperPdf();
  }


  /* =====================================================
     RECIBIR PÁGINAS DESDE SCANNER
     ===================================================== */

  private cargarPaginasRecibidas(): void {
    const estado = history.state as {
      paginas?: string[];
    };

    if (
      !Array.isArray(estado.paginas) ||
      estado.paginas.length === 0
    ) {
      return;
    }

    this.paginas = estado.paginas.map(
      (dataUrl, indice) => ({
        id: Date.now() + indice,
        dataUrl,
        originalDataUrl: dataUrl,
        nombre: `Página ${indice + 1}`,
      }),
    );
  }


  /* =====================================================
     IMPORTAR PDF
     ===================================================== */

  async importarArchivosPdf(
    evento: Event,
  ): Promise<void> {
    const input =
      evento.target as HTMLInputElement;

    const archivos =
      Array.from(input.files ?? []);

    if (archivos.length === 0) {
      return;
    }

    const archivosPdf = archivos.filter(
      (archivo) =>
        archivo.type === 'application/pdf' ||
        archivo.name
          .toLowerCase()
          .endsWith('.pdf'),
    );

    if (archivosPdf.length === 0) {
      this.mensajeError =
        'Selecciona al menos un archivo PDF.';

      input.value = '';
      return;
    }

    this.importando = true;
    this.mensaje = '';
    this.mensajeError = '';

    try {
      let paginasImportadas = 0;

      for (const archivo of archivosPdf) {
        const buffer =
          await archivo.arrayBuffer();

        const documentoPdf =
          await getDocument({
            data: new Uint8Array(buffer),
          }).promise;

        for (
          let numeroPagina = 1;
          numeroPagina <= documentoPdf.numPages;
          numeroPagina++
        ) {
          const paginaPdf =
            await documentoPdf.getPage(
              numeroPagina,
            );

          const viewport =
            paginaPdf.getViewport({
              scale: 1.8,
            });

          const canvas =
            document.createElement('canvas');

          canvas.width =
            Math.ceil(viewport.width);

          canvas.height =
            Math.ceil(viewport.height);

          const contexto =
            canvas.getContext('2d', {
              alpha: false,
            });

          if (!contexto) {
            throw new Error(
              'No se pudo crear la vista de la página.',
            );
          }

          contexto.fillStyle = '#ffffff';

          contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
          );

          await paginaPdf.render({
            canvas,
            canvasContext: contexto,
            viewport,
          }).promise;

          const dataUrl =
            canvas.toDataURL(
              'image/jpeg',
              0.92,
            );

          this.paginas.push({
            id:
              Date.now() +
              paginasImportadas +
              Math.floor(
                Math.random() * 100000,
              ),

            dataUrl,
            originalDataUrl: dataUrl,

            nombre:
              `${archivo.name} - Página ${numeroPagina}`,
          });

          paginasImportadas++;

          paginaPdf.cleanup();
        }

        documentoPdf.cleanup();
      }

      this.mensaje =
        paginasImportadas === 1
          ? 'Se importó una página del PDF.'
          : `Se importaron ${paginasImportadas} páginas del PDF.`;
    } catch (error) {
      console.error(
        'No se pudo importar el PDF:',
        error,
      );

      this.mensajeError =
        'No se pudo procesar el PDF. Revisa que el archivo no esté dañado o protegido.';
    } finally {
      this.importando = false;
      input.value = '';
    }
  }


  /* =====================================================
     SELECCIÓN Y ORGANIZACIÓN
     ===================================================== */

  seleccionarPagina(id: number): void {
    this.cancelarRecorte();

    this.paginaSeleccionadaId = id;

    this.reiniciarControlesEditor();
  }


  obtenerPaginaSeleccionada():
    PaginaPdf | undefined {
    return this.paginas.find(
      (pagina) =>
        pagina.id ===
        this.paginaSeleccionadaId,
    );
  }


  cerrarEditor(): void {
    this.cancelarRecorte();

    this.paginaSeleccionadaId = null;

    this.reiniciarControlesEditor();
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


  eliminarPagina(id: number): void {
    this.paginas = this.paginas.filter(
      (pagina) => pagina.id !== id,
    );

    if (
      this.paginaSeleccionadaId === id
    ) {
      this.cerrarEditor();
    }

    this.mensaje = '';
    this.mensajeError = '';
  }


  eliminarTodas(): void {
    this.paginas = [];

    this.cerrarEditor();

    this.mensaje = '';
    this.mensajeError = '';
  }


  /* =====================================================
     VISTA PREVIA EN TIEMPO REAL
     ===================================================== */

  obtenerFiltroVistaPrevia(): string {
    return [
      `brightness(${this.brillo}%)`,
      `contrast(${this.contraste}%)`,
      `grayscale(${this.escalaGrises}%)`,
    ].join(' ');
  }


  seleccionarFiltro(
    filtro: Exclude<
      FiltroSeleccionado,
      'ninguno'
    >,
  ): void {
    if (
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    this.filtroSeleccionado = filtro;

    switch (filtro) {
      case 'documento':
        this.brillo = 108;
        this.contraste = 145;
        this.escalaGrises = 10;
        break;

      case 'grises':
        this.brillo = 100;
        this.contraste = 110;
        this.escalaGrises = 100;
        break;

      case 'blanco-negro':
        this.brillo = 105;
        this.contraste = 190;
        this.escalaGrises = 100;
        break;

      case 'claro':
        this.brillo = 125;
        this.contraste = 108;
        this.escalaGrises = 0;
        break;

      case 'oscuro':
        this.brillo = 78;
        this.contraste = 125;
        this.escalaGrises = 0;
        break;
    }
  }


  async guardarAjustesPagina():
    Promise<void> {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    this.procesandoEdicion = true;

    try {
      pagina.dataUrl =
        await this.transformarImagen(
          pagina.dataUrl,
          {
            brillo: this.brillo,
            contraste: this.contraste,
            escalaGrises:
              this.escalaGrises,

            blancoNegro:
              this.filtroSeleccionado ===
              'blanco-negro',
          },
        );

      this.reiniciarControlesEditor();

      this.mensaje =
        'Los ajustes se guardaron en la página.';
    } catch (error) {
      console.error(
        'No se pudieron guardar los ajustes:',
        error,
      );

      this.mensajeError =
        'No se pudieron guardar los ajustes.';
    } finally {
      this.procesandoEdicion = false;
    }
  }


  async girarPaginaSeleccionada():
    Promise<void> {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    this.procesandoEdicion = true;

    try {
      pagina.dataUrl =
        await this.transformarImagen(
          pagina.dataUrl,
          {
            rotacion: 90,
          },
        );

      this.mensaje =
        'La página se giró correctamente.';
    } catch (error) {
      console.error(
        'No se pudo girar la página:',
        error,
      );

      this.mensajeError =
        'No se pudo girar la página.';
    } finally {
      this.procesandoEdicion = false;
    }
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
    this.reiniciarControlesEditor();

    this.mensaje =
      'La página se restauró a su estado original.';
  }


  /* =====================================================
     RECORTE INTERACTIVO
     ===================================================== */

  activarRecorte(): void {
    if (
      !this.obtenerPaginaSeleccionada() ||
      this.procesandoEdicion
    ) {
      return;
    }

    this.destruirCropperPdf();

    this.modoRecorte = true;
    this.cropperPendientePdf = true;
  }


  cancelarRecorte(): void {
    this.destruirCropperPdf();

    this.modoRecorte = false;
    this.cropperPendientePdf = false;
  }


  aplicarRecorte(): void {
    const pagina =
      this.obtenerPaginaSeleccionada();

    if (
      !pagina ||
      !this.cropperPdf ||
      this.procesandoEdicion
    ) {
      return;
    }

    this.procesandoEdicion = true;

    try {
      const canvas =
        this.cropperPdf.getCroppedCanvas({
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

      pagina.dataUrl =
        canvas.toDataURL(
          'image/jpeg',
          0.95,
        );

      this.cancelarRecorte();

      this.mensaje =
        'El recorte se aplicó correctamente.';
    } catch (error) {
      console.error(
        'No se pudo recortar la página:',
        error,
      );

      this.mensajeError =
        'No se pudo recortar la página.';
    } finally {
      this.procesandoEdicion = false;
    }
  }


  girarDentroDelRecorte(): void {
    this.cropperPdf?.rotate(90);
  }


  private inicializarCropperPdf(
    imagen: HTMLImageElement,
  ): void {
    this.destruirCropperPdf();

    const crearCropper = (): void => {
      if (!this.modoRecorte) {
        return;
      }

      this.cropperPdf = new Cropper(
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


  private destruirCropperPdf(): void {
    this.cropperPdf?.destroy();
    this.cropperPdf = undefined;
  }


  /* =====================================================
     TRANSFORMACIONES DE IMAGEN
     ===================================================== */

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

          contexto.fillStyle = '#ffffff';

          contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
          );

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
        gris >= 155
          ? 255
          : 0;

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


  private reiniciarControlesEditor(): void {
    this.brillo = 100;
    this.contraste = 100;
    this.escalaGrises = 0;

    this.filtroSeleccionado =
      'ninguno';
  }


  /* =====================================================
     CREAR Y COMPARTIR PDF
     ===================================================== */

  async crearPdf(): Promise<void> {
    if (
      this.paginas.length === 0 ||
      this.generando ||
      this.importando ||
      this.modoRecorte
    ) {
      return;
    }

    this.generando = true;
    this.mensaje = '';
    this.mensajeError = '';

    try {
      const bytesPdf =
        await this.generarPdfBytes();

      const nombreArchivo =
        this.obtenerNombreArchivo();

      if (Capacitor.isNativePlatform()) {
        await this.guardarYCompartir(
          bytesPdf,
          nombreArchivo,
        );

        this.mensaje =
          'PDF creado correctamente.';
      } else {
        this.descargarEnNavegador(
          bytesPdf,
          nombreArchivo,
        );

        this.mensaje =
          'PDF descargado correctamente.';
      }
    } catch (error) {
      console.error(
        'No se pudo crear el PDF:',
        error,
      );

      this.mensajeError =
        'Ocurrió un error al generar el PDF.';
    } finally {
      this.generando = false;
    }
  }


  async compartirPdf(): Promise<void> {
    if (
      this.paginas.length === 0 ||
      this.generando ||
      this.importando ||
      this.modoRecorte
    ) {
      return;
    }

    this.generando = true;
    this.mensaje = '';
    this.mensajeError = '';

    try {
      const bytesPdf =
        await this.generarPdfBytes();

      const nombreArchivo =
        this.obtenerNombreArchivo();

      if (Capacitor.isNativePlatform()) {
        await this.guardarYCompartir(
          bytesPdf,
          nombreArchivo,
        );

        this.mensaje =
          'PDF preparado para compartir.';

        return;
      }

      await this.compartirEnNavegador(
        bytesPdf,
        nombreArchivo,
      );
    } catch (error) {
      console.error(
        'No se pudo compartir el PDF:',
        error,
      );

      this.mensajeError =
        'No se pudo compartir el PDF.';
    } finally {
      this.generando = false;
    }
  }


  private async generarPdfBytes():
    Promise<Uint8Array> {
    const documento =
      await PDFDocument.create();

    documento.setTitle(
      this.nombreDocumento.trim() ||
        'Documento escaneado',
    );

    documento.setAuthor('ScanDocsSF');
    documento.setCreator('ScanDocsSF');
    documento.setProducer('ScanDocsSF');

    for (const pagina of this.paginas) {
      const imagenJpeg =
        await this.convertirAJpeg(
          pagina.dataUrl,
          this.calidad / 100,
        );

      const imagen =
        await documento.embedJpg(
          imagenJpeg,
        );

      this.agregarImagenAPdf(
        documento,
        imagen,
      );
    }

    return documento.save({
      useObjectStreams: true,
    });
  }


  private agregarImagenAPdf(
    documento: PDFDocument,
    imagen: PDFImage,
  ): void {
    const dimensiones =
      this.obtenerDimensionesPagina(
        imagen.width,
        imagen.height,
      );

    const paginaPdf =
      documento.addPage([
        dimensiones.ancho,
        dimensiones.alto,
      ]);

    const margenSeguro = Math.min(
      this.margen,
      dimensiones.ancho / 4,
      dimensiones.alto / 4,
    );

    const anchoDisponible =
      dimensiones.ancho -
      margenSeguro * 2;

    const altoDisponible =
      dimensiones.alto -
      margenSeguro * 2;

    const escala = Math.min(
      anchoDisponible / imagen.width,
      altoDisponible / imagen.height,
    );

    const anchoImagen =
      imagen.width * escala;

    const altoImagen =
      imagen.height * escala;

    paginaPdf.drawImage(imagen, {
      x:
        (
          dimensiones.ancho -
          anchoImagen
        ) /
        2,

      y:
        (
          dimensiones.alto -
          altoImagen
        ) /
        2,

      width: anchoImagen,
      height: altoImagen,
    });
  }


  private obtenerDimensionesPagina(
    anchoImagen: number,
    altoImagen: number,
  ): DimensionesPagina {
    let dimensiones:
      DimensionesPagina;

    switch (this.tamanoHoja) {
      case 'carta':
        dimensiones = {
          ancho: 612,
          alto: 792,
        };
        break;

      case 'a4':
        dimensiones = {
          ancho: 595.28,
          alto: 841.89,
        };
        break;

      default:
        dimensiones = {
          ancho: anchoImagen,
          alto: altoImagen,
        };
        break;
    }

    if (
      this.orientacion ===
      'horizontal'
    ) {
      return this.hacerHorizontal(
        dimensiones,
      );
    }

    if (
      this.orientacion ===
      'vertical'
    ) {
      return this.hacerVertical(
        dimensiones,
      );
    }

    return anchoImagen > altoImagen
      ? this.hacerHorizontal(dimensiones)
      : this.hacerVertical(dimensiones);
  }


  private hacerVertical(
    dimensiones: DimensionesPagina,
  ): DimensionesPagina {
    return {
      ancho: Math.min(
        dimensiones.ancho,
        dimensiones.alto,
      ),

      alto: Math.max(
        dimensiones.ancho,
        dimensiones.alto,
      ),
    };
  }


  private hacerHorizontal(
    dimensiones: DimensionesPagina,
  ): DimensionesPagina {
    return {
      ancho: Math.max(
        dimensiones.ancho,
        dimensiones.alto,
      ),

      alto: Math.min(
        dimensiones.ancho,
        dimensiones.alto,
      ),
    };
  }


  private convertirAJpeg(
    dataUrl: string,
    calidad: number,
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const imagen = new Image();

        imagen.onload = () => {
          const canvas =
            document.createElement(
              'canvas',
            );

          canvas.width =
            imagen.naturalWidth;

          canvas.height =
            imagen.naturalHeight;

          const contexto =
            canvas.getContext('2d');

          if (!contexto) {
            reject(
              new Error(
                'No se pudo procesar la imagen.',
              ),
            );

            return;
          }

          contexto.fillStyle =
            '#ffffff';

          contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height,
          );

          contexto.drawImage(
            imagen,
            0,
            0,
            canvas.width,
            canvas.height,
          );

          resolve(
            canvas.toDataURL(
              'image/jpeg',
              calidad,
            ),
          );
        };

        imagen.onerror = () => {
          reject(
            new Error(
              'No se pudo cargar una página.',
            ),
          );
        };

        imagen.src = dataUrl;
      },
    );
  }


  private async guardarYCompartir(
    bytesPdf: Uint8Array,
    nombreArchivo: string,
  ): Promise<void> {
    const base64 =
      this.bytesABase64(bytesPdf);

    const archivo =
      await Filesystem.writeFile({
        path: nombreArchivo,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

    await Share.share({
      title:
        this.nombreDocumento.trim() ||
        'Documento PDF',

      text:
        'Documento creado con ScanDocsSF',

      files: [archivo.uri],

      dialogTitle:
        'Compartir o guardar PDF',
    });
  }


  private async compartirEnNavegador(
    bytesPdf: Uint8Array,
    nombreArchivo: string,
  ): Promise<void> {
    const blob = new Blob(
      [bytesPdf as BlobPart],
      {
        type: 'application/pdf',
      },
    );

    const archivo = new File(
      [blob],
      nombreArchivo,
      {
        type: 'application/pdf',
      },
    );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [archivo],
      })
    ) {
      await navigator.share({
        title: this.nombreDocumento,
        text:
          'Documento creado con ScanDocsSF',
        files: [archivo],
      });

      this.mensaje =
        'PDF compartido correctamente.';

      return;
    }

    this.descargarEnNavegador(
      bytesPdf,
      nombreArchivo,
    );

    this.mensaje =
      'El navegador no permite compartir archivos; se descargó el PDF.';
  }


  private descargarEnNavegador(
    bytesPdf: Uint8Array,
    nombreArchivo: string,
  ): void {
    const blob = new Blob(
      [bytesPdf as BlobPart],
      {
        type: 'application/pdf',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const enlace =
      document.createElement('a');

    enlace.href = url;
    enlace.download = nombreArchivo;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }


  private obtenerNombreArchivo(): string {
    const nombre =
      this.nombreDocumento
        .trim()
        .replace(
          /[<>:"/\\|?*\u0000-\u001F]/g,
          '',
        )
        .replace(/\s+/g, ' ');

    return `${
      nombre ||
      'Documento escaneado'
    }.pdf`;
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
      const bloque = bytes.subarray(
        inicio,
        inicio + tamanoBloque,
      );

      binario +=
        String.fromCharCode(...bloque);
    }

    return btoa(binario);
  }
}