import { NovelProject } from './types';

export const mockProject: NovelProject = {
  id: 'novela_demo',
  title: 'Mi Novela Visual',
  description: 'Proyecto base con fondos y sprites locales.',
  isPublic: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),

  backgroundGallery: [
    { id: 'bg_aula', name: 'Aula de Clases', url: './backgrounds/aula.png' },
    { id: 'bg_pasillo', name: 'Pasillo Escolar', url: './backgrounds/pasillo.png' },
    { id: 'bg_parque', name: 'Parque Atardecer', url: './backgrounds/parque_tarde.png' },
    { id: 'bg_cuarto', name: 'Habitación', url: './backgrounds/habitacion.png' },
    { id: 'bg_noche', name: 'Ciudad Nocturna', url: './backgrounds/calle_noche.png' }
  ],

  variables: {
    tiene_cuaderno: { name: 'tiene_cuaderno', type: 'boolean', defaultValue: false, description: 'Determina si encontró el cuaderno' },
    puntos_amistad: { name: 'puntos_amistad', type: 'number', defaultValue: 0, description: 'Afinidad general acumulada' }
  },

  characters: {
    mio: {
      id: 'mio',
      name: 'Mio',
      color: '#ec4899',
      bio: 'Estudiante amable y alegre.',
      avatarUrl: './sprites/mio_normal.png',
      isPublic: true,
      hasAffinity: true,
      affinity: 0,
      minAffinity: -20,
      maxAffinity: 100,
      showAffinityBar: true,
      customStats: {},
      relations: [],
      expressions: {
        normal: './sprites/mio_normal.png',
        feliz: './sprites/mio_feliz.png',
        sonrojada: './sprites/mio_sonrojada.png',
        seria: './sprites/mio_seria.png'
      }
    },
    yuna: {
      id: 'yuna',
      name: 'Yuna',
      color: '#a855f7',
      bio: 'Compañera reservada y reflexiva.',
      avatarUrl: './sprites/yuna_normal.png',
      isPublic: true,
      hasAffinity: true,
      affinity: 0,
      minAffinity: -20,
      maxAffinity: 100,
      showAffinityBar: true,
      customStats: {},
      relations: [],
      expressions: {
        normal: './sprites/yuna_normal.png',
        feliz: './sprites/yuna_feliz.png',
        sonrojada: './sprites/yuna_sonrojada.png',
        seria: './sprites/yuna_seria.png'
      }
    }
  },

  chapters: [
    {
      id: 'cap_1',
      title: 'Capítulo 1: El Comienzo',
      scenes: [
        {
          id: 'escena_1',
          title: 'Aula de Clases',
          backgroundUrl: './backgrounds/aula.png',
          branches: {},
          timeline: [
            {
              type: 'dialogue',
              id: 'dlg_1',
              speakerId: 'mio',
              text: '¡Hola! Qué sorpresa encontrarte aquí tan temprano.',
              charactersOnStage: [
                {
                  characterId: 'mio',
                  expression: 'normal',
                  slot: 'center',
                  verticalSlot: 'floor',
                  scale: 'medium',
                  brightness: 100,
                  animation: 'bounce'
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
