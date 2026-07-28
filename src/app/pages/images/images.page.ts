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

import { Capacitor } from '@capacitor/core';

import {
  Document,
  ImageRun,
  Packer,
  Paragraph,
} from 'docx';

import PptxGenJS from 'pptxgenjs';

import * as XLSX from 'xlsx';

import JSZip from 'jszip';


import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem';

import { Share } from '@capacitor/share';

import Cropper from 'cropperjs';

import { addIcons } from 'ionicons';

import {
  addOutline,
  arrowDownOutline,
  arrowUpOutline,
  closeOutline,
  copyOutline,
  cropOutline,
  downloadOutline,
  imagesOutline,
  refreshOutline,
  returnUpForwardOutline,
  shareOutline,
  trashOutline,
} from 'ionicons/icons';


interface ImagenEditable {
  id: number;
  dataUrl: string;
  originalDataUrl: string;
  nombre: string;
}


type FormatoSalida =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'txt'
  | 'zip';


type FormatoImagenExportable =
  | 'jpg'
  | 'png'
  | 'webp';


type FiltroImagen =
  | 'original'
  | 'documento'
  | 'grises'
  | 'blanco-negro'
  | 'claro'
  | 'oscuro';


interface AjustesImagen {
  rotacion?: number;
  brillo?: number;
  contraste?: number;
  escalaGrises?: number;
  blancoNegro?: boolean;
}


@Component({
  selector: 'app-images',
  templateUrl: './images.page.html',
  styleUrls: ['./images.page.scss'],
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
export class ImagesPage
  implements AfterViewChecked, OnDestroy {

  @ViewChild('imagenEditor')
  imagenEditor?: ElementRef<HTMLImageElement>;


  imagenes: ImagenEditable[] = [];

  imagenSeleccionadaId: number | null = null;

  brillo = 100;
  contraste = 100;
  escalaGrises = 0;

  formatoSalida: FormatoSalida = 'jpg';
  calidad = 92;

  modoRecorte = false;
  procesandoEdicion = false;
  exportando = false;
  importando = false;

  mensaje = '';
  mensajeError = '';

  private cropper?: Cropper;
  private cropperPendiente = false;


  constructor() {
    addIcons({
      addOutline,
      arrowDownOutline,
      arrowUpOutline,
      closeOutline,
      copyOutline,
      cropOutline,
      downloadOutline,
      imagesOutline,
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


  async importarImagenes(
    evento: Event,
  ): Promise<void> {
    const input =
      evento.target as HTMLInputElement;

    const archivos =
      Array.from(input.files ?? []);

    if (archivos.length === 0) {
      return;
    }

    this.importando = true;
    this.mensaje = '';
    this.mensajeError = '';

    try {
      const archivosValidos =
        archivos.filter(
          (archivo) =>
            archivo.type.startsWith(
              'image/',
            ),
        );

      if (archivosValidos.length === 0) {
        this.mensajeError =
          'Selecciona al menos una imagen válida.';

        return;
      }

      let ultimoId: number | null = null;

      for (
        let indice = 0;
        indice < archivosValidos.length;
        indice++
      ) {
        const archivo =
          archivosValidos[indice];

        const dataUrl =
          await this.archivoADataUrl(
            archivo,
          );

        const id =
          Date.now() +
          indice +
          Math.floor(
            Math.random() * 100000,
          );

        this.imagenes.push({
          id,
          dataUrl,
          originalDataUrl: dataUrl,
          nombre: archivo.name,
        });

        ultimoId = id;
      }

      if (ultimoId !== null) {
        this.seleccionarImagen(
          ultimoId,
        );
      }

      this.mensaje =
        archivosValidos.length === 1
          ? 'Se importó una imagen.'
          : `Se importaron ${archivosValidos.length} imágenes.`;
    } catch (error) {
      console.error(
        'No se pudieron importar las imágenes:',
        error,
      );

      this.mensajeError =
        'No se pudieron importar las imágenes.';
    } finally {
      this.importando = false;
      input.value = '';
    }
  }


  seleccionarImagen(id: number): void {
    this.cancelarRecorte();

    this.imagenSeleccionadaId = id;

    this.reiniciarControles();
  }


  obtenerImagenSeleccionada():
    ImagenEditable | undefined {
    return this.imagenes.find(
      (imagen) =>
        imagen.id ===
        this.imagenSeleccionadaId,
    );
  }


  cerrarEditor(): void {
    this.cancelarRecorte();

    this.imagenSeleccionadaId = null;

    this.reiniciarControles();
  }


  subirImagen(indice: number): void {
    if (indice <= 0) {
      return;
    }

    [
      this.imagenes[indice - 1],
      this.imagenes[indice],
    ] = [
      this.imagenes[indice],
      this.imagenes[indice - 1],
    ];
  }


  bajarImagen(indice: number): void {
    if (
      indice >=
      this.imagenes.length - 1
    ) {
      return;
    }

    [
      this.imagenes[indice + 1],
      this.imagenes[indice],
    ] = [
      this.imagenes[indice],
      this.imagenes[indice + 1],
    ];
  }


  duplicarImagen(id: number): void {
    const indice =
      this.imagenes.findIndex(
        (imagen) => imagen.id === id,
      );

    if (indice === -1) {
      return;
    }

    const original =
      this.imagenes[indice];

    const nuevoId =
      Date.now() +
      Math.floor(
        Math.random() * 100000,
      );

    const copia: ImagenEditable = {
      id: nuevoId,
      dataUrl: original.dataUrl,
      originalDataUrl:
        original.originalDataUrl,
      nombre:
        `Copia de ${original.nombre}`,
    };

    this.imagenes.splice(
      indice + 1,
      0,
      copia,
    );

    this.seleccionarImagen(
      nuevoId,
    );
  }


  eliminarImagen(id: number): void {
    this.imagenes =
      this.imagenes.filter(
        (imagen) => imagen.id !== id,
      );

    if (
      this.imagenSeleccionadaId === id
    ) {
      this.cerrarEditor();
    }
  }


  eliminarTodas(): void {
    this.imagenes = [];

    this.cerrarEditor();

    this.mensaje = '';
    this.mensajeError = '';
  }


  activarRecorte(): void {
    if (
      !this.obtenerImagenSeleccionada() ||
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

    this.modoRecorte = false;
    this.cropperPendiente = false;
  }


  aplicarRecorte(): void {
    const imagenSeleccionada =
      this.obtenerImagenSeleccionada();

    if (
      !imagenSeleccionada ||
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
          imageSmoothingQuality:
            'high',
        });

      if (!canvas) {
        throw new Error(
          'No se pudo generar el recorte.',
        );
      }

      imagenSeleccionada.dataUrl =
        canvas.toDataURL(
          'image/jpeg',
          0.95,
        );

      this.cancelarRecorte();

      this.mensaje =
        'Recorte aplicado correctamente.';
    } catch (error) {
      console.error(
        'No se pudo aplicar el recorte:',
        error,
      );

      this.mensajeError =
        'No se pudo aplicar el recorte.';
    } finally {
      this.procesandoEdicion = false;
    }
  }


  girarRecorte(): void {
    this.cropper?.rotate(90);
  }


  async girarImagen(): Promise<void> {
    const imagenSeleccionada =
      this.obtenerImagenSeleccionada();

    if (
      !imagenSeleccionada ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    await this.aplicarTransformacion(
      imagenSeleccionada,
      {
        rotacion: 90,
      },
    );
  }


  seleccionarFiltro(
    filtro: FiltroImagen,
  ): void {
    if (
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    if (filtro === 'original') {
      this.restaurarImagen();
      return;
    }

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


  obtenerFiltroVistaPrevia(): string {
    return [
      `brightness(${this.brillo}%)`,
      `contrast(${this.contraste}%)`,
      `grayscale(${this.escalaGrises}%)`,
    ].join(' ');
  }


  async guardarAjustes(): Promise<void> {
    const imagenSeleccionada =
      this.obtenerImagenSeleccionada();

    if (
      !imagenSeleccionada ||
      this.procesandoEdicion ||
      this.modoRecorte
    ) {
      return;
    }

    await this.aplicarTransformacion(
      imagenSeleccionada,
      {
        brillo: this.brillo,
        contraste: this.contraste,
        escalaGrises:
          this.escalaGrises,

        blancoNegro:
          this.contraste >= 180 &&
          this.escalaGrises === 100,
      },
    );

    this.reiniciarControles();

    this.mensaje =
      'Ajustes guardados correctamente.';
  }


  restaurarImagen(): void {
    const imagenSeleccionada =
      this.obtenerImagenSeleccionada();

    if (!imagenSeleccionada) {
      return;
    }

    imagenSeleccionada.dataUrl =
      imagenSeleccionada.originalDataUrl;

    this.cancelarRecorte();
    this.reiniciarControles();

    this.mensaje =
      'Imagen restaurada.';
  }


async descargarImagenes(): Promise<void> {
  await this.exportarDocumento(false);
}


async compartirImagenes(): Promise<void> {
  await this.exportarDocumento(true);
}


private async exportarDocumento(
  compartir: boolean,
): Promise<void> {
  if (
    this.imagenes.length === 0 ||
    this.exportando
  ) {
    return;
  }

  this.exportando = true;
  this.mensaje = 'Preparando archivo...';
  this.mensajeError = '';

  try {
    switch (this.formatoSalida) {
      case 'docx':
        await this.exportarDocx(compartir);
        break;

      case 'pptx':
        await this.exportarPptx(compartir);
        break;

      case 'xlsx':
        await this.exportarXlsx(compartir);
        break;

      case 'txt':
        await this.exportarTxt(compartir);
        break;

      case 'zip':
        await this.exportarZip(compartir);
        break;

      case 'jpg':
      case 'png':
      case 'webp':
        await this.exportarImagenesIndividuales(
          this.formatoSalida,
          compartir,
        );
        break;
    }
  } catch (error) {
    console.error(
      'No se pudo exportar el archivo:',
      error,
    );

    this.mensaje = '';

    this.mensajeError =
      'No se pudo generar el archivo seleccionado.';
  } finally {
    this.exportando = false;
  }
}
private async exportarDocx(
  compartir: boolean,
): Promise<void> {
  const elementos: Paragraph[] = [];

  for (
    let indice = 0;
    indice < this.imagenes.length;
    indice++
  ) {
    const imagen =
      this.imagenes[indice];

    const dataUrl =
      await this.convertirFormato(
        imagen.dataUrl,
        'jpg',
        this.calidad / 100,
      );

    const bytes =
      this.dataUrlAUint8Array(dataUrl);

    const dimensiones =
      await this.obtenerDimensionesImagen(
        dataUrl,
      );

    const tamano =
      this.ajustarDimensiones(
        dimensiones.ancho,
        dimensiones.alto,
        560,
        720,
      );

    elementos.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: bytes,
            transformation: {
              width: tamano.ancho,
              height: tamano.alto,
            },
            type: 'jpg',
          }),
        ],
        pageBreakBefore:
          indice > 0,
      }),
    );
  }

  const documento =
    new Document({
      sections: [
        {
          children: elementos,
        },
      ],
    });

  const blob =
    await Packer.toBlob(documento);

  await this.entregarBlob({
    blob,
    nombre:
      `imagenes_${Date.now()}.docx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    titulo: 'Documento Word',
    compartir,
  });
}
private async exportarPptx(
  compartir: boolean,
): Promise<void> {
  const presentacion =
    new PptxGenJS();

  presentacion.layout =
    'LAYOUT_WIDE';

  presentacion.author =
    'ScanDocsSF';

  presentacion.subject =
    'Imágenes exportadas';

  presentacion.title =
    'Presentación de imágenes';

  for (
    let indice = 0;
    indice < this.imagenes.length;
    indice++
  ) {
    const imagen =
      this.imagenes[indice];

    const dataUrl =
      await this.convertirFormato(
        imagen.dataUrl,
        'jpg',
        this.calidad / 100,
      );

    const dimensiones =
      await this.obtenerDimensionesImagen(
        dataUrl,
      );

    const posicion =
      this.ajustarImagenEnArea({
        anchoImagen:
          dimensiones.ancho,
        altoImagen:
          dimensiones.alto,
        x: 0.35,
        y: 0.35,
        anchoArea: 12.63,
        altoArea: 6.65,
      });

    const diapositiva =
      presentacion.addSlide();

    diapositiva.background = {
      color: 'FFFFFF',
    };

    diapositiva.addImage({
      data: dataUrl,
      x: posicion.x,
      y: posicion.y,
      w: posicion.ancho,
      h: posicion.alto,
    });

    diapositiva.addText(
      `${indice + 1}`,
      {
        x: 12.45,
        y: 7.1,
        w: 0.45,
        h: 0.2,
        fontSize: 8,
        color: '666666',
        align: 'right',
        margin: 0,
      },
    );
  }

  const resultado =
    await presentacion.write({
      outputType: 'arraybuffer',
      compression: true,
    });

  const blob =
    new Blob(
      [resultado as ArrayBuffer],
      {
        type:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      },
    );

  await this.entregarBlob({
    blob,
    nombre:
      `presentacion_${Date.now()}.pptx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    titulo:
      'Presentación PowerPoint',
    compartir,
  });
}

private async exportarXlsx(
  compartir: boolean,
): Promise<void> {
  const datos = await Promise.all(
    this.imagenes.map(
      async (
        imagen,
        indice,
      ) => {
        const dimensiones =
          await this.obtenerDimensionesImagen(
            imagen.dataUrl,
          );

        return {
          Numero: indice + 1,
          Nombre: imagen.nombre,
          Ancho: dimensiones.ancho,
          Alto: dimensiones.alto,
          FormatoSalida:
            this.formatoSalida,
          Estado: 'Editada',
        };
      },
    ),
  );

  const hoja =
    XLSX.utils.json_to_sheet(
      datos,
    );

  hoja['!cols'] = [
    { wch: 10 },
    { wch: 35 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 15 },
  ];

  const libro =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    libro,
    hoja,
    'Imágenes',
  );

  const resultado =
    XLSX.write(
      libro,
      {
        bookType: 'xlsx',
        type: 'array',
      },
    );

  const blob =
    new Blob(
      [resultado as BlobPart],
      {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    );

  await this.entregarBlob({
    blob,
    nombre:
      `imagenes_${Date.now()}.xlsx`,
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    titulo: 'Archivo Excel',
    compartir,
  });
}

private async exportarTxt(
  compartir: boolean,
): Promise<void> {
  const lineas = [
    'ScanDocsSF',
    'Listado de imágenes',
    '',
  ];

  for (
    let indice = 0;
    indice < this.imagenes.length;
    indice++
  ) {
    const imagen =
      this.imagenes[indice];

    const dimensiones =
      await this.obtenerDimensionesImagen(
        imagen.dataUrl,
      );

    lineas.push(
      `Imagen ${indice + 1}`,
      `Nombre: ${imagen.nombre}`,
      `Dimensiones: ${dimensiones.ancho} × ${dimensiones.alto}`,
      '',
    );
  }

  const blob =
    new Blob(
      [lineas.join('\n')],
      {
        type:
          'text/plain;charset=utf-8',
      },
    );

  await this.entregarBlob({
    blob,
    nombre:
      `imagenes_${Date.now()}.txt`,
    mimeType:
      'text/plain',
    titulo: 'Archivo de texto',
    compartir,
  });
}

private async exportarZip(
  compartir: boolean,
): Promise<void> {
  const zip =
    new JSZip();

  const carpeta =
    zip.folder('imagenes');

  if (!carpeta) {
    throw new Error(
      'No se pudo crear la carpeta ZIP.',
    );
  }

  for (
    let indice = 0;
    indice < this.imagenes.length;
    indice++
  ) {
    const imagen =
      this.imagenes[indice];

    const dataUrl =
      await this.convertirFormato(
        imagen.dataUrl,
        'jpg',
        this.calidad / 100,
      );

    const base64 =
      dataUrl.split(',')[1];

    carpeta.file(
      `imagen_${indice + 1}.jpg`,
      base64,
      {
        base64: true,
      },
    );
  }

  const bytes =
    await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

  const blob =
    new Blob(
      [bytes as BlobPart],
      {
        type: 'application/zip',
      },
    );

  await this.entregarBlob({
    blob,
    nombre:
      `imagenes_${Date.now()}.zip`,
    mimeType:
      'application/zip',
    titulo: 'Archivo ZIP',
    compartir,
  });
}

private async exportarImagenesIndividuales(
  formato: FormatoImagenExportable,
  compartir: boolean,
): Promise<void> {
  const archivos: Blob[] = [];
  const nombres: string[] = [];

  for (
    let indice = 0;
    indice < this.imagenes.length;
    indice++
  ) {
    const imagen =
      this.imagenes[indice];

    const dataUrl =
      await this.convertirFormato(
        imagen.dataUrl,
        formato,
        this.calidad / 100,
      );

    const blob =
      this.dataUrlABlob(dataUrl);

    archivos.push(blob);

    nombres.push(
      `imagen_${indice + 1}.${formato}`,
    );
  }

  if (archivos.length === 1) {
    await this.entregarBlob({
      blob: archivos[0],
      nombre: nombres[0],
      mimeType:
        this.obtenerTipoMime(
          formato,
        ),
      titulo: 'Imagen',
      compartir,
    });

    return;
  }

  const zip =
    new JSZip();

  for (
    let indice = 0;
    indice < archivos.length;
    indice++
  ) {
    zip.file(
      nombres[indice],
      archivos[indice],
    );
  }

  const zipBlob =
    await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

  await this.entregarBlob({
    blob: zipBlob,
    nombre:
      `imagenes_${Date.now()}.zip`,
    mimeType:
      'application/zip',
    titulo: 'Imágenes',
    compartir,
  });
}

private async entregarBlob(
  opciones: {
    blob: Blob;
    nombre: string;
    mimeType: string;
    titulo: string;
    compartir: boolean;
  },
): Promise<void> {
  if (
    Capacitor.isNativePlatform()
  ) {
    const base64 =
      await this.blobABase64(
        opciones.blob,
      );

    const resultado =
      await Filesystem.writeFile({
        path: opciones.nombre,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });

    await Share.share({
      title: opciones.compartir
        ? `Compartir ${opciones.titulo}`
        : `Guardar ${opciones.titulo}`,

      text: opciones.compartir
        ? 'Archivo creado con ScanDocsSF.'
        : 'Selecciona Archivos, Files o Drive para guardar el archivo.',

      files: [resultado.uri],

      dialogTitle:
        opciones.compartir
          ? 'Compartir archivo'
          : 'Guardar archivo',
    });

    this.mensaje =
      opciones.compartir
        ? 'Archivo preparado para compartir.'
        : 'Selecciona una ubicación para guardar el archivo.';

    return;
  }

  if (
    opciones.compartir &&
    navigator.share
  ) {
    const archivo =
      new File(
        [opciones.blob],
        opciones.nombre,
        {
          type: opciones.mimeType,
        },
      );

    if (
      navigator.canShare?.({
        files: [archivo],
      })
    ) {
      await navigator.share({
        title:
          opciones.titulo,
        files: [archivo],
      });

      this.mensaje =
        'Archivo compartido correctamente.';

      return;
    }
  }

  this.descargarBlob(
    opciones.blob,
    opciones.nombre,
  );

  this.mensaje =
    'Archivo descargado correctamente.';
}

private descargarBlob(
  blob: Blob,
  nombre: string,
): void {
  const url =
    URL.createObjectURL(blob);

  const enlace =
    document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;

  document.body.appendChild(
    enlace,
  );

  enlace.click();
  enlace.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


private blobABase64(
  blob: Blob,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const lector =
        new FileReader();

      lector.onload = () => {
        if (
          typeof lector.result !==
          'string'
        ) {
          reject(
            new Error(
              'No se pudo convertir el archivo.',
            ),
          );

          return;
        }

        const base64 =
          lector.result.split(',')[1];

        resolve(base64);
      };

      lector.onerror = () => {
        reject(
          new Error(
            'No se pudo leer el archivo.',
          ),
        );
      };

      lector.readAsDataURL(blob);
    },
  );
}


private dataUrlABlob(
  dataUrl: string,
): Blob {
  const [
    cabecera,
    contenido,
  ] = dataUrl.split(',');

  const mime =
    cabecera
      .match(/data:(.*?);base64/)
      ?.[1] ??
    'application/octet-stream';

  const binario =
    atob(contenido);

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

  return new Blob(
    [bytes],
    {
      type: mime,
    },
  );
}


private dataUrlAUint8Array(
  dataUrl: string,
): Uint8Array {
  const base64 =
    dataUrl.split(',')[1];

  const binario =
    atob(base64);

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

  return bytes;
}


private obtenerDimensionesImagen(
  dataUrl: string,
): Promise<{
  ancho: number;
  alto: number;
}> {
  return new Promise(
    (resolve, reject) => {
      const imagen =
        new Image();

      imagen.onload = () => {
        resolve({
          ancho:
            imagen.naturalWidth,
          alto:
            imagen.naturalHeight,
        });
      };

      imagen.onerror = () => {
        reject(
          new Error(
            'No se pudieron obtener las dimensiones.',
          ),
        );
      };

      imagen.src = dataUrl;
    },
  );
}


private ajustarDimensiones(
  anchoOriginal: number,
  altoOriginal: number,
  anchoMaximo: number,
  altoMaximo: number,
): {
  ancho: number;
  alto: number;
} {
  const escala =
    Math.min(
      anchoMaximo / anchoOriginal,
      altoMaximo / altoOriginal,
      1,
    );

  return {
    ancho:
      Math.round(
        anchoOriginal * escala,
      ),

    alto:
      Math.round(
        altoOriginal * escala,
      ),
  };
}


private ajustarImagenEnArea(
  opciones: {
    anchoImagen: number;
    altoImagen: number;
    x: number;
    y: number;
    anchoArea: number;
    altoArea: number;
  },
): {
  x: number;
  y: number;
  ancho: number;
  alto: number;
} {
  const proporcionImagen =
    opciones.anchoImagen /
    opciones.altoImagen;

  const proporcionArea =
    opciones.anchoArea /
    opciones.altoArea;

  let ancho =
    opciones.anchoArea;

  let alto =
    opciones.altoArea;

  if (
    proporcionImagen >
    proporcionArea
  ) {
    alto =
      ancho /
      proporcionImagen;
  } else {
    ancho =
      alto *
      proporcionImagen;
  }

  return {
    x:
      opciones.x +
      (
        opciones.anchoArea -
        ancho
      ) /
      2,

    y:
      opciones.y +
      (
        opciones.altoArea -
        alto
      ) /
      2,

    ancho,
    alto,
  };
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

          zoomable: true,
          zoomOnTouch: true,
          zoomOnWheel: true,

          cropBoxMovable: true,
          cropBoxResizable: true,

          toggleDragModeOnDblclick:
            false,
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

    imagen.onload =
      crearCropper;
  }


  private destruirCropper(): void {
    this.cropper?.destroy();
    this.cropper = undefined;
  }


  private async aplicarTransformacion(
    imagenEditable: ImagenEditable,
    ajustes: AjustesImagen,
  ): Promise<void> {
    this.procesandoEdicion = true;

    try {
      imagenEditable.dataUrl =
        await this.transformarImagen(
          imagenEditable.dataUrl,
          ajustes,
        );
    } catch (error) {
      console.error(
        'No se pudo editar la imagen:',
        error,
      );

      this.mensajeError =
        'No se pudo editar la imagen.';
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
          const ancho =
            imagen.naturalWidth;

          const alto =
            imagen.naturalHeight;

          const rotacion =
            (
              (
                ajustes.rotacion ??
                0
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

          canvas.width =
            intercambiar
              ? alto
              : ancho;

          canvas.height =
            intercambiar
              ? ancho
              : alto;

          const contexto =
            canvas.getContext(
              '2d',
              {
                willReadFrequently:
                  true,
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

          contexto.fillStyle =
            '#ffffff';

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
            -ancho / 2,
            -alto / 2,
            ancho,
            alto,
          );

          contexto.restore();
          contexto.filter = 'none';

          if (
            ajustes.blancoNegro
          ) {
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
        imagen.data[indice] *
          0.299 +
        imagen.data[indice + 1] *
          0.587 +
        imagen.data[indice + 2] *
          0.114;

      const valor =
        gris >= 155
          ? 255
          : 0;

      imagen.data[indice] =
        valor;

      imagen.data[indice + 1] =
        valor;

      imagen.data[indice + 2] =
        valor;
    }

    contexto.putImageData(
      imagen,
      0,
      0,
    );
  }


  private convertirFormato(
    dataUrl: string,
    formato: FormatoImagenExportable,
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
                'No se pudo convertir la imagen.',
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

          resolve(
            canvas.toDataURL(
              this.obtenerTipoMime(
                formato,
              ),
              calidad,
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


  private obtenerTipoMime(
    formato: FormatoImagenExportable,
  ): string {
    switch (formato) {
      case 'png':
        return 'image/png';

      case 'webp':
        return 'image/webp';

      default:
        return 'image/jpeg';
    }
  }


  private archivoADataUrl(
    archivo: File,
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const lector =
          new FileReader();

        lector.onload = () => {
          if (
            typeof lector.result !==
            'string'
          ) {
            reject(
              new Error(
                'No se pudo leer el archivo.',
              ),
            );

            return;
          }

          resolve(
            lector.result,
          );
        };

        lector.onerror = () => {
          reject(
            new Error(
              'No se pudo leer la imagen.',
            ),
          );
        };

        lector.readAsDataURL(
          archivo,
        );
      },
    );
  }


  private dataUrlAArchivo(
    dataUrl: string,
    nombre: string,
    tipoMime: string,
  ): File {
    const base64 =
      dataUrl.split(',')[1];

    const binario =
      atob(base64);

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
        binario.charCodeAt(
          indice,
        );
    }

    return new File(
      [bytes],
      nombre,
      {
        type: tipoMime,
      },
    );
  }


  private descargarDataUrl(
    dataUrl: string,
    nombre: string,
  ): void {
    const enlace =
      document.createElement('a');

    enlace.href = dataUrl;
    enlace.download = nombre;

    document.body.appendChild(
      enlace,
    );

    enlace.click();
    enlace.remove();
  }


  private async compartirEnNavegador(
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
        title:
          'Imágenes editadas',
        files: archivos,
      });

      this.mensaje =
        'Imágenes compartidas correctamente.';

      return;
    }

    for (const archivo of archivos) {
      const url =
        URL.createObjectURL(
          archivo,
        );

      const enlace =
        document.createElement('a');

      enlace.href = url;
      enlace.download =
        archivo.name;

      document.body.appendChild(
        enlace,
      );

      enlace.click();
      enlace.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    this.mensaje =
      'El navegador no permite compartir; se descargaron las imágenes.';
  }


  private reiniciarControles(): void {
    this.brillo = 100;
    this.contraste = 100;
    this.escalaGrises = 0;
  }
}