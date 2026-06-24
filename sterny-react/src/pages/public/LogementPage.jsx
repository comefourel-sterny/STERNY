import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabaseClient } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth.jsx';
import { deduireRecherche } from '../../utils/deduireRecherche';
import { couvertureSemaines } from '../../utils/matching';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LogementPage.css';

// ---- SVG icons as components ----
const PlaceholderSvg = ({ size = 80 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" />
    <path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
    <circle cx="13" cy="7" r="1" fill="white" />
    <rect x="8" y="2" width="14" height="14" rx="2" />
  </svg>
);

const HeartEmpty = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#1E293B">
    <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z" />
  </svg>
);

const HeartFull = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="#E8622A">
    <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ---- Equipment SVGs ----
const IC = '#1E293B';
const EQUIPEMENT_SVGS = {
  'wifi': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M409-149q-29-29-29-71t29-71q29-29 71-29t71 29q29 29 29 71t-29 71q-29 29-71 29t-71-29ZM254-346l-84-86q59-59 138.5-93.5T480-560q92 0 171.5 35T790-430l-84 84q-44-44-102-69t-124-25q-66 0-124 25t-102 69ZM84-516 0-600q92-94 215-147t265-53q142 0 265 53t215 147l-84 84q-77-77-178.5-120.5T480-680q-116 0-217.5 43.5T84-516Z"/></svg>`,
  'cuisine équipée': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M160-160v-320H80v-80h160q-33 0-56.5-23.5T160-640v-160h240v160q0 33-23.5 56.5T320-560h320v-120q0-17-11.5-28.5T600-720q-17 0-28.5 11.5T560-680h-80q0-50 35-85t85-35q50 0 85 35t35 85v120h160v80h-80v320H160Zm80-480h80v-80h-80v80Zm0 400h200v-240H240v240Zm280 0h200v-240H520v240ZM240-640h80-80Zm0 400h480-480Z"/></svg>`,
  'lave-linge': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M280-80q-33 0-56.5-23.5T200-160v-640q0-33 23.5-56.5T280-880h400q33 0 56.5 23.5T760-800v640q0 33-23.5 56.5T680-80H280Zm0-80h400v-640H280v640Zm200-120q75 0 127.5-52.5T660-460q0-75-52.5-127.5T480-640q-75 0-127.5 52.5T300-460q0 75 52.5 127.5T480-280Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z"/></svg>`,
  'lave-vaisselle': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M200-80q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h560q33 0 56.5 23.5T840-800v640q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm120-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm320 0q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z"/></svg>`,
  'parking': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M240-120v-720h280q100 0 170 70t70 170q0 100-70 170t-170 70H360v240H240Zm120-360h160q42 0 71-29t29-71q0-42-29-71t-71-29H360v200Z"/></svg>`,
  'balcon/terrasse': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M120-120v-200h80v120h240v-120h80v120h240v-120h80v200H120Z"/></svg>`,
  'meublé': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M200-160v-80h40v-160q0-51 28-94.5T340-560v-40q0-42 29-71t71-29h80q42 0 71 29t29 71v40q44 22 72 65.5t28 94.5v160h40v80H200Z"/></svg>`,
  'meublé complet': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M200-160v-80h40v-160q0-51 28-94.5T340-560v-40q0-42 29-71t71-29h80q42 0 71 29t29 71v40q44 22 72 65.5t28 94.5v160h40v80H200Z"/></svg>`,
  'cave': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M120-120v-80h80v-560q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v560h80v80H120Z"/></svg>`,
  'lit': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M80-200v-240q0-27 11-49t29-39v-112q0-50 35-85t85-35h160q23 0 43 8.5t37 23.5q17-15 37-23.5t43-8.5h160q50 0 85 35t35 85v112q18 17 29 39t11 49v240h-80v-80H160v80H80Z"/></svg>`,
  'garage': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M120-120v-560l360-200 360 200v560H640v-320H320v320H120Z"/></svg>`,
  'jardin': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M440-120v-264q-51 8-97.5-8T256-440q-36-30-56-73.5T180-600q0-90 57-156t143-80q-3-21-1-41.5t9-39.5q35 16 60.5 44.5T485-812q20-22 44-38t52-26q11 20 15 41t1 42q86 14 142.5 80T796-560q0 43-19.5 86.5T722-400q-39 40-86.5 56T536-336v216h-96Z"/></svg>`,
  'piscine': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M80-160v-66q43-6 80-24t74-52q37 34 74 52t80 24q43-6 80-24t74-52q37 34 74 52t80 24q43-6 80-24t74-52q37 34 74.5 52T960-226v66H80Z"/></svg>`,
  'ascenseur': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M200-80q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h560q33 0 56.5 23.5T840-800v640q0 33-23.5 56.5T760-80H200Z"/></svg>`,
  'climatisation': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M440-80v-166L310-116l-56-56 186-188v-80h-80L172-252l-56-56 130-132H80v-80h166L116-650l56-56 188 186h80v-80L252-788l56-56 132 130V-880h80v166l130-130 56 56-186 188v80h80l188-188 56 56-130 132h166v80H714l130 130-56 56-188-186h-80v80l188 188-56 56-132-130v166h-80Z"/></svg>`,
  'chauffage': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M480-80q-83 0-141.5-58.5T280-280q0-48 21-89.5t59-70.5v-320q0-50 35-85t85-35q50 0 85 35t35 85v320q38 29 59 70.5t21 89.5q0 83-58.5 141.5T480-80Z"/></svg>`,
  'sèche-linge': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M280-80q-33 0-56.5-23.5T200-160v-640q0-33 23.5-56.5T280-880h400q33 0 56.5 23.5T760-800v640q0 33-23.5 56.5T680-80H280Z"/></svg>`,
  'télévision': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M160-200q-33 0-56.5-23.5T80-280v-480q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v480q0 33-23.5 56.5T800-200H160Z"/></svg>`,
  'tv': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M160-200q-33 0-56.5-23.5T80-280v-480q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v480q0 33-23.5 56.5T800-200H160Z"/></svg>`,
  'micro-ondes': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M120-160q-33 0-56.5-23.5T40-240v-480q0-33 23.5-56.5T120-800h720q33 0 56.5 23.5T920-720v480q0 33-23.5 56.5T840-160H120Z"/></svg>`,
  'bureau': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M160-120v-80h640v80H160Zm160-160v-280H200q-33 0-56.5-23.5T120-640v-200h80v200h120v-200h80v200h120v-200h80v200h120v-200h80v200q0 33-23.5 56.5T720-560H600v280h-80v-280H400v280h-80Z"/></svg>`,
  'fibre': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M409-149q-29-29-29-71t29-71q29-29 71-29t71 29q29 29 29 71t-29 71q-29 29-71 29t-71-29Z"/></svg>`,
  'douche': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M280-80q-33 0-56.5-23.5T200-160v-320h-40q-17 0-28.5-11.5T120-520q0-17 11.5-28.5T160-560h480q17 0 28.5 11.5T680-520q0 17-11.5 28.5T640-480h-40v320q0 33-23.5 56.5T520-80H280Z"/></svg>`,
  'baignoire': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M200-200v-27q-33-12-56.5-42T120-332v-228h80v120h640v-280q0-17-11.5-28.5T800-760q-17 0-28.5 11.5T760-720h-80q0-50 35-85t85-35q50 0 85 35t35 85v388q0 33-23.5 63T840-227v27h-80v-40H280v40h-80Z"/></svg>`,
  'réfrigérateur': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M280-80q-33 0-56.5-23.5T200-160v-640q0-33 23.5-56.5T280-880h400q33 0 56.5 23.5T760-800v640q0 33-23.5 56.5T680-80H280Z"/></svg>`,
  'frigo': `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="M280-80q-33 0-56.5-23.5T200-160v-640q0-33 23.5-56.5T280-880h400q33 0 56.5 23.5T760-800v640q0 33-23.5 56.5T680-80H280Z"/></svg>`
};

const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="${IC}"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`;

const KEYWORD_SVGS = [
  { keywords: ['wifi', 'internet', 'fibre', 'réseau'], key: 'wifi' },
  { keywords: ['cuisine', 'cuisson', 'plaque'], key: 'cuisine équipée' },
  { keywords: ['lave-linge', 'linge', 'buanderie', 'machine à laver'], key: 'lave-linge' },
  { keywords: ['vaisselle'], key: 'lave-vaisselle' },
  { keywords: ['parking', 'garage', 'voiture', 'stationnement'], key: 'parking' },
  { keywords: ['balcon', 'terrasse', 'extérieur', 'loggia'], key: 'balcon/terrasse' },
  { keywords: ['meublé', 'mobilier', 'meubl'], key: 'meublé' },
  { keywords: ['cave', 'stockage', 'grenier'], key: 'cave' },
  { keywords: ['jardin', 'pelouse'], key: 'jardin' },
  { keywords: ['piscine', 'bassin'], key: 'piscine' },
  { keywords: ['ascenseur'], key: 'ascenseur' },
  { keywords: ['clim', 'ventil'], key: 'climatisation' },
  { keywords: ['chauff', 'radiateur'], key: 'chauffage' },
  { keywords: ['sèche', 'séchage'], key: 'sèche-linge' },
  { keywords: ['tv', 'télé', 'écran'], key: 'tv' },
  { keywords: ['micro-onde'], key: 'micro-ondes' },
  { keywords: ['bureau', 'desk', 'travail'], key: 'bureau' },
  { keywords: ['lit', 'couchage', 'matelas'], key: 'lit' },
  { keywords: ['douche', 'salle d'], key: 'douche' },
  { keywords: ['bain', 'baignoire'], key: 'baignoire' },
  { keywords: ['frigo', 'réfrig', 'congél'], key: 'réfrigérateur' },
  { keywords: ['café', 'cafet', 'nespresso', 'expresso'], key: 'cuisine équipée' },
  { keywords: ['four'], key: 'cuisine équipée' },
  { keywords: ['rangement', 'placard', 'étagère'], key: 'cave' }
];

function getEquipementSvg(equipName) {
  const nameLower = equipName.toLowerCase().replace(/^autre:\s*/i, '').trim();
  if (EQUIPEMENT_SVGS[nameLower]) return EQUIPEMENT_SVGS[nameLower];
  for (const rule of KEYWORD_SVGS) {
    if (rule.keywords.some(kw => nameLower.includes(kw))) {
      return EQUIPEMENT_SVGS[rule.key] || FALLBACK_ICON;
    }
  }
  return FALLBACK_ICON;
}

function getEquipementLabel(equipName) {
  return equipName.replace(/^Autre:\s*/i, '');
}

// ---- School acronyms dictionary ----
const SIGLES_ECOLES = {
  'ENSAB': 'École nationale supérieure d\'architecture de Bretagne',
  'INSA': 'Institut national des sciences appliquées',
  'ISEN': 'Institut supérieur de l\'électronique et du numérique',
  'EPITECH': 'Epitech école informatique',
  'EPITA': 'École pour l\'informatique et les techniques avancées',
  'ESCP': 'ESCP Business School',
  'ESSEC': 'ESSEC Business School',
  'HEC': 'HEC Paris',
  'EDHEC': 'EDHEC Business School',
  'KEDGE': 'KEDGE Business School',
  'SKEMA': 'SKEMA Business School',
  'NEOMA': 'NEOMA Business School',
  'CENTRALE': 'École Centrale',
  'POLYTECH': 'Polytech école d\'ingénieurs',
  'IUT': 'Institut universitaire de technologie',
  'BTS': 'Brevet de technicien supérieur',
  'IFSI': 'Institut de formation en soins infirmiers',
  'CNAM': 'Conservatoire national des arts et métiers',
  'RSB': 'Rennes School of Business',
  'MINES': 'École des Mines',
  'TELECOM': 'Télécom Paris',
  'IMT': 'Institut Mines-Télécom',
  'UTC': 'Université de technologie de Compiègne',
  'UTT': 'Université de technologie de Troyes',
  'UTBM': 'Université de technologie de Belfort-Montbéliard',
  'YNOV': 'Ynov campus numérique',
  'HETIC': 'HETIC web école',
  'EFREI': 'EFREI école d\'ingénieurs',
  'ECE': 'ECE école d\'ingénieurs',
  'ISEP': 'Institut supérieur d\'électronique de Paris',
  'ENAC': 'École nationale de l\'aviation civile',
  'SUPINFO': 'Supinfo école informatique',
  'STUDI': 'Studi école en ligne',
};

// ---- Helper functions ----
function parseLocalDate(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getLundi(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m > 0 ? m.toString().padStart(2, '0') : '');
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodePolyline(encoded, precision) {
  precision = precision || 5;
  const factor = Math.pow(10, precision);
  const coords = [];
  let lat = 0, lng = 0, index = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

const PRIVACY_RADIUS_KM = 0.5;

function clipRouteOutsideCircle(coords, centerLng, centerLat) {
  const clipped = coords.filter(c => {
    const R = 6371;
    const dLat = (c[1] - centerLat) * Math.PI / 180;
    const dLon = (c[0] - centerLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(centerLat * Math.PI / 180) * Math.cos(c[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist > PRIVACY_RADIUS_KM;
  });
  return clipped.length >= 2 ? clipped : [];
}

function createGeoCircle(centerLng, centerLat, radiusKm, steps) {
  steps = steps || 64;
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const newLat = centerLat + (dy / 111.32);
    const newLng = centerLng + (dx / (111.32 * Math.cos(centerLat * Math.PI / 180)));
    coords.push([newLng, newLat]);
  }
  return coords;
}

// Travel mode SVG icons
const TravelDrivingSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#64748B"><path d="M240-200v40q0 17-11.5 28.5T200-120h-40q-17 0-28.5-11.5T120-160v-320l84-240q6-18 21.5-29t34.5-11h440q19 0 34.5 11t21.5 29l84 240v320q0 17-11.5 28.5T800-120h-40q-17 0-28.5-11.5T720-160v-40H240Zm-8-360h496l-42-120H274l-42 120Zm-32 80v200-200Zm100 160q25 0 42.5-17.5T360-380q0-25-17.5-42.5T300-440q-25 0-42.5 17.5T240-380q0 25 17.5 42.5T300-320Zm360 0q25 0 42.5-17.5T720-380q0-25-17.5-42.5T660-440q-25 0-42.5 17.5T600-380q0 25 17.5 42.5T660-320Zm-460 40h560v-200H200v200Z" /></svg>
);
const TravelTransitSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#64748B"><path d="M297.5-422.5Q280-405 280-380t17.5 42.5Q315-320 340-320t42.5-17.5Q400-355 400-380t-17.5-42.5Q365-440 340-440t-42.5 17.5ZM480-880q172 0 246 37t74 123v96q-18-6-38-9.5t-42-5.5v-41H240v120h260q-16 17-27.5 37T453-480H240v120q0 33 23.5 56.5T320-280h120v80H320v40q0 17-11.5 28.5T280-120h-40q-17 0-28.5-11.5T200-160v-82q-18-20-29-44.5T160-340v-380q0-83 77-121.5T480-880Z" /></svg>
);
const TravelCyclingSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#64748B"><path d="M200-160q-85 0-142.5-57.5T0-360q0-85 58.5-142.5T200-560q77 0 129.5 46T396-400h26l-72-200h-70v-80h200v80h-44l14 40h192l-58-160H480v-80h104q26 0 46.5 14t29.5 38l68 186h32q83 0 141.5 58.5T960-362q0 84-58 143t-142 59q-72 0-126.5-45T564-320H396q-14 69-68 114.5T200-160Z" /></svg>
);
const TravelWalkingSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#64748B"><path d="m280-40 112-564-72 28v136h-80v-188l202-86q14-6 29.5-7t29.5 4q14 5 26.5 14t20.5 23l40 64q26 42 70.5 69T760-520v80q-70 0-125-29t-94-74l-25 123 84 80v300h-80v-260l-84-64-72 324h-84Zm203.5-723.5Q460-787 460-820t23.5-56.5Q507-900 540-900t56.5 23.5Q620-853 620-820t-23.5 56.5Q573-740 540-740t-56.5-23.5Z" /></svg>
);

// ==============================
// MAIN COMPONENT
// ==============================
export default function LogementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const logementId = searchParams.get('id');

  // Page state
  const [logement, setLogement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainPhoto, setMainPhoto] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hostData, setHostData] = useState(null);
  const [dejaCandidateFlag, setDejaCandidateFlag] = useState(false);
  const [annonceProprietaireId, setAnnonceProprietaireId] = useState(null);
  const [badgeText, setBadgeText] = useState('Nouveau');
  const [showBadge, setShowBadge] = useState(true);

  // Calendar state
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedWeeks, setSelectedWeeks] = useState(new Set());
  const [hostAvailableDates, setHostAvailableDates] = useState(new Set());
  const [dateDebut, setDateDebut] = useState('01/09/2026');
  const [dateFin, setDateFin] = useState('31/08/2027');
  const [dureeMin, setDureeMin] = useState('3 mois');

  // Couverture du visiteur connecté (étape 1a : données, pas encore affichées)
  const [couvertureVisiteur, setCouvertureVisiteur] = useState(null);
  const [profilVisiteurCharge, setProfilVisiteurCharge] = useState(false);

  // Modals
  const [showModalCandidature, setShowModalCandidature] = useState(false);
  const [showModalMessage, setShowModalMessage] = useState(false);
  const [showModalSignalement, setShowModalSignalement] = useState(false);
  const [candidatureMessage, setCandidatureMessage] = useState('');
  const [messageCandidature, setMessageCandidature] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [messageConfirmation, setMessageConfirmation] = useState('');
  const [signalMotif, setSignalMotif] = useState('');
  const [signalDesc, setSignalDesc] = useState('');
  const [signalMsg, setSignalMsg] = useState({ text: '', type: '' });
  const [candidatureSubmitting, setCandidatureSubmitting] = useState(false);
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [signalSubmitting, setSignalSubmitting] = useState(false);

  // Map state
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const schoolMarkerRef = useRef(null);
  const logementCoordsRef = useRef({ lat: null, lng: null, ville: '' });
  const schoolCoordsRef = useRef({ lat: null, lng: null });
  const distanceLineId = 'distance-line';
  const mbxSessionRef = useRef(crypto.randomUUID());

  // School search state
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolSuggestions, setSchoolSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const schoolSearchTimeoutRef = useRef(null);

  // Travel times state
  const [showTravelTimes, setShowTravelTimes] = useState(false);
  const [travelDriving, setTravelDriving] = useState('\u2014');
  const [travelTransit, setTravelTransit] = useState('\u2014');
  const [travelCycling, setTravelCycling] = useState('\u2014');
  const [travelWalking, setTravelWalking] = useState('\u2014');
  const [activeTravelMode, setActiveTravelMode] = useState('driving');
  const transitDataRef = useRef(null);

  // Thumbnail scroll hints
  const thumbnailGridRef = useRef(null);
  const [showScrollHintRight, setShowScrollHintRight] = useState(false);
  const [showScrollHintLeft, setShowScrollHintLeft] = useState(false);

  // Share hover
  const [shareHover, setShareHover] = useState(false);
  const [signalLinkHover, setSignalLinkHover] = useState(false);

  // Redirect if no ID
  useEffect(() => {
    if (!logementId) {
      navigate('/recherche');
    }
  }, [logementId, navigate]);

  // Hide nav border + shadow on this page
  useEffect(() => {
    const nav = document.querySelector('nav')
    if (nav) {
      nav.style.borderBottom = 'none'
      nav.style.boxShadow = 'none'
    }
    return () => {
      if (nav) {
        nav.style.borderBottom = ''
        nav.style.boxShadow = ''
      }
    }
  }, []);

  // Load annonce
  useEffect(() => {
    if (!logementId) return;
    chargerAnnonce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logementId]);

  // Check favorite status
  useEffect(() => {
    if (!user || !logementId) return;
    (async () => {
      try {
        const { data } = await supabaseClient
          .from('favoris')
          .select('id')
          .eq('user_id', user.id)
          .eq('annonce_id', logementId)
          .maybeSingle();
        if (data) setIsFavorite(true);
      } catch (e) { /* ignore */ }
    })();
  }, [user, logementId]);

  async function chargerAnnonce() {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('annonces')
        .select('*')
        .eq('id', logementId)
        .single();

      if (error) throw error;
      if (!data) {
        navigate('/recherche');
        return;
      }

      setAnnonceProprietaireId(data.user_id);
      setLogement(data);

      // Set main photo
      if (data.photos && data.photos.length > 0) {
        setMainPhoto(data.photos[0]);
      }

      // Badge
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        setBadgeText('Nouveau');
        setShowBadge(true);
      } else {
        setShowBadge(false);
      }

      // Dates
      processAvailabilityDates(data);

      // Load proprietaire
      chargerProprietaire(data.user_id);

      // Check existing candidature
      await verifierCandidatureExistante();

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }

  function processAvailabilityDates(data) {
    try {
      const pattern = data.disponibilites_pattern;
      const hasPattern = Array.isArray(pattern) && pattern.length > 0;
      const hasDebut = !!data.disponibilites_debut;

      if (hasDebut) {
        const d = parseLocalDate(data.disponibilites_debut);
        if (d) setDateDebut(d.toLocaleDateString('fr-FR'));
      }

      let dateFinStr = null;
      if (hasPattern) {
        const sorted = [...pattern].sort();
        dateFinStr = sorted[sorted.length - 1];
        const df = parseLocalDate(dateFinStr);
        if (df) setDateFin(df.toLocaleDateString('fr-FR'));
      } else if (hasDebut) {
        const df = parseLocalDate(data.disponibilites_debut);
        if (df) {
          df.setMonth(df.getMonth() + 6);
          dateFinStr = formatDateLocal(df);
          setDateFin(df.toLocaleDateString('fr-FR'));
        }
      }

      if (hasDebut) {
        const availSet = new Set(hasPattern ? pattern : []);
        setHostAvailableDates(availSet);

        // Pre-select weeks from URL dates param
        const datesParam = searchParams.get('dates');
        if (datesParam && datesParam.trim() !== '') {
          try {
            const userDates = new Set(datesParam.split(','));
            const newSelected = new Set();
            availSet.forEach(dateStr => {
              if (userDates.has(dateStr)) {
                const [py, pm, pd] = dateStr.split('-').map(Number);
                const d = new Date(py, pm - 1, pd);
                const lundi = getLundi(d);
                newSelected.add(formatDateLocal(lundi));
              }
            });
            setSelectedWeeks(newSelected);
          } catch (e) {
            console.error('Erreur parsing dates:', e);
          }
        }
      }

      if (data.duree_min) {
        setDureeMin(data.duree_min + ' mois');
      }
    } catch (err) {
      console.error('Erreur calendrier:', err);
    }
  }

  async function chargerProprietaire(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('prenom, nom, type_user, photo_profil_url')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setHostData(data);
      }
    } catch (error) {
      console.error('Erreur chargement propriétaire:', error);
    }
  }

  async function verifierCandidatureExistante() {
    if (!user || !logementId) return;
    try {
      const { data, error } = await supabaseClient
        .from('candidatures')
        .select('id')
        .eq('locataire_id', user.id)
        .eq('annonce_id', logementId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') return;
      if (data) setDejaCandidateFlag(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  // ---- Map initialization ----
  useEffect(() => {
    if (!logement || !logement.adresse || !logement.latitude || !logement.longitude) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized

    const lat = logement.latitude;
    const lng = logement.longitude;
    const villeLabel = logement.ville ? logement.ville.charAt(0).toUpperCase() + logement.ville.slice(1) : '';
    logementCoordsRef.current = { lat, lng, ville: villeLabel };

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 13,
      scrollZoom: false
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    // Enable scroll zoom on click
    const container = mapContainerRef.current;
    const enableScroll = () => {
      map.scrollZoom.enable();
      container.style.cursor = 'grab';
    };
    const disableScroll = (e) => {
      if (!container.contains(e.target)) {
        map.scrollZoom.disable();
        container.style.cursor = '';
      }
    };
    container.addEventListener('click', enableScroll);
    document.addEventListener('click', disableScroll);

    map.on('load', () => {
      const circleCoords = createGeoCircle(lng, lat, 0.5, 64);
      map.addSource('zone-circle', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [circleCoords] } }
      });
      map.addLayer({
        id: 'zone-circle-fill', type: 'fill', source: 'zone-circle',
        paint: { 'fill-color': '#1E293B', 'fill-opacity': 0.1 }
      });
      map.addLayer({
        id: 'zone-circle-stroke', type: 'line', source: 'zone-circle',
        paint: { 'line-color': '#1E293B', 'line-width': 2, 'line-opacity': 0.3 }
      });
    });

    // Logement marker
    const logementEl = document.createElement('div');
    logementEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#1E293B" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"><path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z"/><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2"/><path d="M18 22v-3"/><circle cx="10" cy="10" r="3"/></svg>';
    new mapboxgl.Marker({ element: logementEl })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>Zone approximative</strong><br>' + villeLabel))
      .addTo(map);

    return () => {
      container.removeEventListener('click', enableScroll);
      document.removeEventListener('click', disableScroll);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logement]);

  // ---- Thumbnail scroll ----
  useEffect(() => {
    if (!logement?.photos || logement.photos.length <= 5) return;
    setShowScrollHintRight(true);
    const grid = thumbnailGridRef.current;
    if (!grid) return;
    const handleScroll = () => {
      const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 10;
      const atStart = grid.scrollLeft <= 10;
      setShowScrollHintRight(!atEnd);
      setShowScrollHintLeft(!atStart);
    };
    grid.addEventListener('scroll', handleScroll);
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [logement]);

  // Étape 1a — charge le rythme du VISITEUR connecté et dérive sa couverture pour CETTE annonce.
  // Lecture seule, sans effet visuel pour l'instant. Aucun lien avec le flux Postuler.
  useEffect(() => {
    let annule = false;
    (async () => {
      if (!user || !logement) { setCouvertureVisiteur(null); setProfilVisiteurCharge(false); return; }
      const { data: profil, error } = await supabaseClient
        .from('users')
        .select('rhythm_calendar, ville_ecole, ville_entreprise, statut_ville_ecole, statut_ville_entreprise')
        .eq('id', user.id)
        .single();
      if (annule) return;
      if (error || !profil) { setProfilVisiteurCharge(true); setCouvertureVisiteur(null); console.log('[1a] profil visiteur introuvable', error); return; }

      const recherche = deduireRecherche(profil); // [{ ville, nature, semaines }]
      // semaines cherchées = union de toutes les villes où le visiteur cherche (futures, déjà filtrées par deduireRecherche)
      const semainesCherchees = [...new Set(recherche.flatMap((r) => r.semaines))];
      const dispo = Array.isArray(logement.disponibilites_pattern) ? logement.disponibilites_pattern : [];
      const cov = couvertureSemaines({ semainesCherchees, disponibilitesOffre: dispo });

      setCouvertureVisiteur(cov);
      setProfilVisiteurCharge(true);
      console.log('[1a] COUVERTURE VISITEUR pour annonce', logement.id, '→ couvre', cov.couvertes, 'de tes', cov.totalCherchees, 'semaines');
      console.log('[1a] villes cherchées:', recherche.map((r) => r.ville), '| semaines cherchées:', semainesCherchees.length, '| dispo annonce:', dispo.length);
      console.log('[1a] semaines couvertes:', cov.semainesCouvertes);
    })();
    return () => { annule = true; };
  }, [user, logement]);

  // ---- Favorite toggle ----
  async function toggleFavorite() {
    if (!user) {
      navigate('/connexion');
      return;
    }
    try {
      if (isFavorite) {
        const { error } = await supabaseClient
          .from('favoris')
          .delete()
          .eq('user_id', user.id)
          .eq('annonce_id', logementId);
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabaseClient
          .from('favoris')
          .insert([{ user_id: user.id, annonce_id: logementId }]);
        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Erreur favori:', err);
    }
  }

  // ---- Share ----
  async function partagerAnnonce() {
    const titre = logement?.titre || 'Logement sur STERNY';
    const url = window.location.href;
    const texte = `Découvre ce logement sur STERNY : ${titre}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titre, text: texte, url });
      } catch (e) {
        if (e.name !== 'AbortError') console.log('Partage annulé');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      // Simple toast via state could be added, for now just clipboard
    } catch {
      prompt('Copie ce lien pour partager :', url);
    }
  }

  // ---- Candidature ----
  async function envoyerCandidature(e) {
    e.preventDefault();
    setCandidatureSubmitting(true);
    setCandidatureMessage('');

    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (!currentUser) {
      setCandidatureMessage('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Tu dois \u00eatre connect\u00e9 pour postuler</div>');
      setTimeout(() => navigate('/connexion'), 2000);
      return;
    }

    if (!messageCandidature.trim() || messageCandidature.length < 50) {
      setCandidatureMessage('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Le message doit faire au moins 50 caractères</div>');
      setCandidatureSubmitting(false);
      return;
    }

    try {
      // Check identity verification
      const { data: userData } = await supabaseClient
        .from('users')
        .select('identite_verifiee')
        .eq('id', currentUser.id)
        .single();

      if (!userData || userData.identite_verifiee !== 'verifiee') {
        setCandidatureMessage('<div style="padding: 15px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; color: #9A3412; font-weight: 500; line-height: 1.5;"><strong>V\u00e9rification d\u2019identit\u00e9 requise</strong><br>Pour la s\u00e9curit\u00e9 de tous, tu dois v\u00e9rifier ton identit\u00e9 avant de postuler.</div>');

        try {
          const { data: identityData, error: identityError } = await supabaseClient.functions.invoke('create-stripe-identity-session', {
            body: { user_id: currentUser.id, return_url: window.location.href }
          });
          if (identityError) throw identityError;
          if (identityData?.url) {
            window.location.href = identityData.url;
            return;
          }
        } catch (identityErr) {
          console.error('Erreur Stripe Identity:', identityErr);
          setCandidatureMessage('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Impossible de lancer la v\u00e9rification. R\u00e9essaie plus tard.</div>');
          setCandidatureSubmitting(false);
          return;
        }
      }

      // Check existing candidature
      const { data: existingCandidature } = await supabaseClient
        .from('candidatures')
        .select('id')
        .eq('locataire_id', currentUser.id)
        .eq('annonce_id', logementId)
        .maybeSingle();

      if (existingCandidature) {
        setCandidatureMessage('<div style="padding: 15px; background: #fef3c7; border-radius: 8px; color: #92400e; font-weight: 600;">Tu as d\u00e9j\u00e0 postul\u00e9 \u00e0 ce logement</div>');
        setCandidatureSubmitting(false);
        return;
      }

      const { error } = await supabaseClient
        .from('candidatures')
        .insert([{
          annonce_id: logementId,
          locataire_id: currentUser.id,
          message: messageCandidature,
          statut: 'en_attente'
        }])
        .select();

      if (error) throw error;

      setCandidatureMessage('<div style="padding: 15px; background: #dcfce7; border-radius: 8px; color: #166534; font-weight: 600;">Candidature envoy\u00e9e avec succ\u00e8s !</div>');
      setMessageCandidature('');

      setTimeout(() => {
        setShowModalCandidature(false);
        setDejaCandidateFlag(true);
      }, 2000);

    } catch (error) {
      console.error('Erreur envoi candidature:', error);
      setCandidatureMessage('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Erreur lors de l\'envoi de la candidature</div>');
    } finally {
      setCandidatureSubmitting(false);
    }
  }

  // ---- Message ----
  async function envoyerMessageHandler(e) {
    e.preventDefault();
    setMessageSubmitting(true);
    setMessageConfirmation('');

    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    if (!currentUser) {
      setMessageConfirmation('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Tu dois \u00eatre connect\u00e9</div>');
      setTimeout(() => navigate('/connexion'), 2000);
      return;
    }

    if (!contactMessage.trim()) {
      setMessageConfirmation('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Le message ne peut pas \u00eatre vide</div>');
      setMessageSubmitting(false);
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('messages')
        .insert([{
          expediteur_id: currentUser.id,
          destinataire_id: annonceProprietaireId,
          contenu: contactMessage,
          annonce_id: logementId
        }]);

      if (error) throw error;

      setMessageConfirmation('<div style="padding: 15px; background: #dcfce7; border-radius: 8px; color: #166534; font-weight: 600;">Message envoy\u00e9 !</div>');
      setContactMessage('');

      setTimeout(() => setShowModalMessage(false), 2000);

    } catch (error) {
      console.error('Erreur envoi message:', error);
      setMessageConfirmation('<div style="padding: 15px; background: #fee2e2; border-radius: 8px; color: #991b1b; font-weight: 600;">Erreur lors de l\'envoi</div>');
    } finally {
      setMessageSubmitting(false);
    }
  }

  // ---- Signalement ----
  async function envoyerSignalement() {
    if (!signalMotif) {
      setSignalMsg({ text: 'Choisis un motif.', type: 'warning' });
      return;
    }
    setSignalSubmitting(true);

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      setSignalMsg({ text: 'Connecte-toi pour signaler.', type: 'warning' });
      setSignalSubmitting(false);
      return;
    }

    try {
      const { error } = await supabaseClient.from('signalements').insert({
        reporter_id: session.user.id,
        type: 'annonce',
        target_id: logementId,
        motif: signalMotif,
        description: signalDesc || null
      });
      if (error) throw error;
      setSignalMsg({ text: 'Signalement envoyé. Merci !', type: 'success' });
      setTimeout(() => setShowModalSignalement(false), 1500);
    } catch (e) {
      console.error('Erreur signalement:', e);
      setSignalMsg({ text: "Erreur lors de l'envoi.", type: 'warning' });
    } finally {
      setSignalSubmitting(false);
    }
  }

  // ---- School search ----
  const searchSchool = useCallback(async (query) => {
    const { lat, lng, ville } = logementCoordsRef.current;
    if (!lat || !lng) return;
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    try {
      const seen = new Map();
      const proximity = lng + ',' + lat;
      const queryUpper = query.trim().toUpperCase();
      const expandedName = SIGLES_ECOLES[queryUpper] || null;
      const searchQueries = [query];
      if (expandedName) searchQueries.push(expandedName);

      const allPromises = [];
      const promiseLabels = [];

      for (const q of searchQueries) {
        const eq = encodeURIComponent(q);
        const mbxQ = ville ? q + ' ' + ville : q;

        allPromises.push(
          fetch('https://api.mapbox.com/search/searchbox/v1/suggest?q=' + encodeURIComponent(mbxQ) + '&language=fr&types=poi&proximity=' + proximity + '&limit=5&session_token=' + mbxSessionRef.current + '&access_token=' + MAPBOX_TOKEN)
            .then(r => r.ok ? r.json() : { suggestions: [] }).catch(() => ({ suggestions: [] }))
        );
        promiseLabels.push('mapbox');

        const psupBase = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/records';
        const psupFields = 'g_ea_lib_vx%2Cville_etab%2Cg_olocalisation_des_formations';
        if (ville) {
          allPromises.push(
            fetch(psupBase + '?where=search(g_ea_lib_vx%2C%22' + eq + '%22)%20AND%20search(ville_etab%2C%22' + encodeURIComponent(ville) + '%22)&limit=10&select=' + psupFields)
              .then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
          );
          promiseLabels.push('parcoursup');
        }
        allPromises.push(
          fetch(psupBase + '?where=search(g_ea_lib_vx%2C%22' + eq + '%22)&limit=10&select=' + psupFields)
            .then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
        );
        promiseLabels.push('parcoursup');

        const photonQ = ville ? q + ' ' + ville : q;
        allPromises.push(
          fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(photonQ) + '&limit=5&lang=fr')
            .then(r => r.ok ? r.json() : { features: [] }).catch(() => ({ features: [] }))
        );
        promiseLabels.push('photon');
      }

      const allResults = await Promise.all(allPromises);

      function normalKey(name, city) {
        const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        return norm(name) + '|' + norm(city || '');
      }

      const eduTypes = ['college', 'university', 'school'];
      const allRetrievePromises = [];

      for (let i = 0; i < allResults.length; i++) {
        const data = allResults[i];
        const label = promiseLabels[i];

        if (label === 'mapbox' && data.suggestions) {
          data.suggestions.filter(s => s.mapbox_id && s.name).slice(0, 3).forEach(s => {
            allRetrievePromises.push(
              fetch('https://api.mapbox.com/search/searchbox/v1/retrieve/' + s.mapbox_id + '?session_token=' + mbxSessionRef.current + '&access_token=' + MAPBOX_TOKEN)
                .then(r => r.ok ? r.json() : null).catch(() => null)
            );
          });
        } else if (label === 'parcoursup' && data.results) {
          data.results.forEach(r => {
            if (r.g_olocalisation_des_formations?.lat && r.g_olocalisation_des_formations?.lon) {
              const key = normalKey(r.g_ea_lib_vx, r.ville_etab);
              if (!seen.has(key)) {
                seen.set(key, { name: r.g_ea_lib_vx, city: r.ville_etab || '', lat: r.g_olocalisation_des_formations.lat, lng: r.g_olocalisation_des_formations.lon });
              }
            }
          });
        } else if (label === 'photon' && data.features) {
          data.features.forEach(f => {
            const props = f.properties || {};
            const geom = f.geometry || {};
            const osmValue = props.osm_value || '';
            const osmKey = props.osm_key || '';
            const isEdu = (osmKey === 'amenity' && eduTypes.includes(osmValue)) || (osmKey === 'building' && eduTypes.includes(osmValue));
            if (!isEdu) return;
            if (props.name && geom.coordinates) {
              const city = props.city || props.county || '';
              const key = normalKey(props.name, city);
              if (!seen.has(key)) {
                seen.set(key, { name: props.name, city, lat: geom.coordinates[1], lng: geom.coordinates[0] });
              }
            }
          });
        }
      }

      const eduCategories = ['school', 'college', 'university', 'education', 'training', 'library'];
      const eduKeywords = ['école', 'ecole', 'université', 'universite', 'lycée', 'lycee', 'institut', 'campus', 'faculté', 'faculte', 'ensa', 'insa', 'isen', 'iut', 'cfa', 'formation', 'supérieur', 'superieur', 'académie', 'academie', 'conservatoire', 'polytech', 'business school', 'school of'];

      const retrieveResults = await Promise.all(allRetrievePromises);
      retrieveResults.forEach(rData => {
        if (rData?.features?.[0]) {
          const f = rData.features[0];
          const coords = f.geometry.coordinates;
          const props = f.properties || {};
          const name = props.name || '';
          const city = props.context?.place?.name || props.context?.locality?.name || '';

          const categories = (props.poi_category || []).map(c => c.toLowerCase());
          const nameLower = name.toLowerCase();
          const isSchool = categories.some(c => eduCategories.includes(c)) || eduKeywords.some(kw => nameLower.includes(kw));
          if (!isSchool) return;

          const key = normalKey(name, city);
          if (name && !seen.has(key)) {
            seen.set(key, { name, city, lat: coords[1], lng: coords[0] });
          }
        }
      });

      let unique = Array.from(seen.values()).filter(r => haversineKm(lat, lng, r.lat, r.lng) < 100);
      unique.sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng));
      unique = unique.slice(0, 7);

      setSchoolSuggestions(unique);
      setShowSuggestions(true);

    } catch (e) {
      console.error('Erreur recherche école:', e);
    }
  }, []);

  function handleSchoolInput(value) {
    setSchoolQuery(value);
    clearTimeout(schoolSearchTimeoutRef.current);
    if (value.trim().length < 2) {
      setShowSuggestions(false);
      return;
    }
    schoolSearchTimeoutRef.current = setTimeout(() => searchSchool(value.trim()), 300);
  }

  function selectSchool(schoolItem) {
    const { lat: sLat, lng: sLng, name, city } = schoolItem;
    const label = name + ' \u2014 ' + city;
    schoolCoordsRef.current = { lat: sLat, lng: sLng };
    setSchoolQuery(label);
    setShowSuggestions(false);

    const map = mapRef.current;
    if (!map) return;
    const { lat, lng } = logementCoordsRef.current;
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    // Remove old school marker
    if (schoolMarkerRef.current) schoolMarkerRef.current.remove();

    // Remove old lines
    clearTransitLayers(map);
    if (map.getSource(distanceLineId)) {
      map.removeLayer(distanceLineId);
      map.removeSource(distanceLineId);
    }

    // Add school marker
    const schoolEl = document.createElement('div');
    schoolEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#E8622A" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
    schoolMarkerRef.current = new mapboxgl.Marker({ element: schoolEl })
      .setLngLat([sLng, sLat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>' + label + '</strong>'))
      .addTo(map);

    setShowTravelTimes(true);
    setActiveTravelMode('driving');
    setTravelDriving('...');
    setTravelTransit('...');
    setTravelCycling('...');
    setTravelWalking('...');

    const origin = lng + ',' + lat;
    const dest = sLng + ',' + sLat;

    // Driving
    fetch('https://api.mapbox.com/directions/v5/mapbox/driving/' + origin + ';' + dest + '?geometries=geojson&overview=full&access_token=' + MAPBOX_TOKEN)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.routes?.[0]) {
          setTravelDriving(formatDuration(data.routes[0].duration));
          traceRoute(map, data.routes[0].geometry.coordinates, lng, lat);
        }
      })
      .catch(() => setTravelDriving('\u2014'));

    // Cycling
    fetch('https://api.mapbox.com/directions/v5/mapbox/cycling/' + origin + ';' + dest + '?overview=false&access_token=' + MAPBOX_TOKEN)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.routes?.[0]) setTravelCycling(formatDuration(data.routes[0].duration)); })
      .catch(() => setTravelCycling('\u2014'));

    // Transit
    fetch('https://api.transitous.org/api/v1/plan?fromPlace=' + lat + ',' + lng + ',0&toPlace=' + sLat + ',' + sLng + ',0')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.itineraries?.length > 0) {
          const best = data.itineraries.reduce((a, b) => a.duration < b.duration ? a : b);
          setTravelTransit(formatDuration(best.duration));
          transitDataRef.current = best;
        } else {
          setTravelTransit('\u2014');
          transitDataRef.current = null;
        }
      })
      .catch(() => { setTravelTransit('\u2014'); transitDataRef.current = null; });

    // Walking
    fetch('https://api.mapbox.com/directions/v5/mapbox/walking/' + origin + ';' + dest + '?overview=false&access_token=' + MAPBOX_TOKEN)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.routes?.[0]) setTravelWalking(formatDuration(data.routes[0].duration)); })
      .catch(() => setTravelWalking('\u2014'));
  }

  function traceRoute(map, coords, logLng, logLat) {
    const clipped = clipRouteOutsideCircle(coords, logLng, logLat);
    if (clipped.length < 2) return;
    map.addSource(distanceLineId, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: clipped } }
    });
    map.addLayer({
      id: distanceLineId, type: 'line', source: distanceLineId,
      paint: { 'line-color': '#E8622A', 'line-width': 4, 'line-opacity': 0.8 },
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    });
    const bounds = new mapboxgl.LngLatBounds();
    clipped.forEach(c => bounds.extend(c));
    bounds.extend([logLng, logLat]);
    map.fitBounds(bounds, { padding: 60 });
  }

  function clearTransitLayers(map) {
    const style = map.getStyle();
    if (style?.layers) {
      style.layers.forEach(layer => {
        if (layer.id.startsWith('transit-leg-')) map.removeLayer(layer.id);
      });
    }
    if (style?.sources) {
      Object.keys(style.sources).forEach(src => {
        if (src.startsWith('transit-leg-')) map.removeSource(src);
      });
    }
  }

  function switchTravelMode(profile) {
    const { lat: sLat, lng: sLng } = schoolCoordsRef.current;
    if (!sLat || !sLng) return;
    setActiveTravelMode(profile);

    const map = mapRef.current;
    if (!map) return;
    const { lat, lng } = logementCoordsRef.current;
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    // Remove old routes
    if (map.getSource(distanceLineId)) {
      map.removeLayer(distanceLineId);
      map.removeSource(distanceLineId);
    }
    clearTransitLayers(map);

    if (profile === 'transit' && transitDataRef.current) {
      const best = transitDataRef.current;
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([lng, lat]);
      bounds.extend([sLng, sLat]);

      const allLegs = best.legs.filter(leg => leg.legGeometry?.points);
      allLegs.forEach((leg, i) => {
        const precision = leg.legGeometry.precision || 7;
        let coords = decodePolyline(leg.legGeometry.points, precision);
        coords = coords.filter(c => c[1] > 41 && c[1] < 52 && c[0] > -6 && c[0] < 10);
        if (coords.length < 2) return;

        if (i < allLegs.length - 1) {
          const nextLeg = allLegs[i + 1];
          const nextPrecision = nextLeg.legGeometry.precision || 7;
          const nextCoords = decodePolyline(nextLeg.legGeometry.points, nextPrecision);
          if (nextCoords.length > 0) coords.push(nextCoords[0]);
        }

        const srcId = 'transit-leg-' + i;
        const isWalk = (leg.mode === 'WALK');
        const clippedCoords = clipRouteOutsideCircle(coords, lng, lat);
        if (clippedCoords.length < 2) return;

        map.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: clippedCoords } }
        });
        map.addLayer({
          id: srcId, type: 'line', source: srcId,
          paint: {
            'line-color': isWalk ? '#94A3B8' : '#E8622A',
            'line-width': isWalk ? 3 : 4,
            'line-opacity': 0.8,
            'line-dasharray': isWalk ? [2, 3] : [1, 0]
          },
          layout: { 'line-cap': 'round', 'line-join': 'round' }
        });
        clippedCoords.forEach(c => bounds.extend(c));
      });

      map.fitBounds(bounds, { padding: 60 });
      return;
    }

    const origin = lng + ',' + lat;
    const dest = sLng + ',' + sLat;
    fetch('https://api.mapbox.com/directions/v5/mapbox/' + profile + '/' + origin + ';' + dest + '?geometries=geojson&overview=full&access_token=' + MAPBOX_TOKEN)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.routes?.[0]) {
          traceRoute(map, data.routes[0].geometry.coordinates, lng, lat);
        }
      });
  }

  // ---- Calendar logic ----
  function isJourSelectionne(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const lundi = getLundi(date);
    return selectedWeeks.has(formatDateLocal(lundi));
  }

  function selectionnerSemaine(date) {
    const lundi = getLundi(date);
    const lundiStr = formatDateLocal(lundi);
    setSelectedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(lundiStr)) next.delete(lundiStr);
      else next.add(lundiStr);
      return next;
    });
  }

  function renderCalendar() {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    const firstDay = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), 1);
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const daysInMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => (
      <div key={'empty-' + i} className="calendar-day empty" />
    ));

    const dayElements = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), day);
      dayDate.setHours(0, 0, 0, 0);

      const isPast = dayDate < today;
      const dayDateStr = formatDateLocal(dayDate);
      const isInPattern = hostAvailableDates.has(dayDateStr);
      const isUserSelected = isJourSelectionne(dayDateStr);

      let classes = 'calendar-day';
      if (isUserSelected) {
        classes += ' user-selected';
        if (isPast) classes += ' past';
      } else if (isInPattern && !isPast) {
        classes += ' host-available';
      } else if (isInPattern && isPast) {
        classes += ' past-available';
      } else if (!isInPattern) {
        classes += ' host-busy';
        if (isPast) classes += ' past';
      }

      if (dayDate.getTime() === today.getTime()) {
        classes += ' today';
      }

      const clickable = (isInPattern && !isPast) || isUserSelected;

      dayElements.push(
        <div
          key={day}
          className={classes}
          onClick={clickable ? () => selectionnerSemaine(dayDate) : undefined}
          style={clickable ? { cursor: 'pointer' } : undefined}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-nav">
          <button
            className="calendar-nav-btn"
            onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="calendar-month-title">
            {monthNames[currentCalendarMonth.getMonth()]} {currentCalendarMonth.getFullYear()}
          </div>
          <button
            className="calendar-nav-btn"
            onClick={() => setCurrentCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="calendar-weekdays">
          {dayNames.map((d, i) => <div key={i} className="calendar-weekday">{d}</div>)}
        </div>

        <div className="calendar-grid">
          {emptyDays}
          {dayElements}
        </div>
      </div>
    );
  }

  // ---- Render helpers ----
  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!logement) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Annonce introuvable</p>
        <Link to="/recherche">Retour à la recherche</Link>
      </div>
    );
  }

  const typeLabel = logement.type_logement ? logement.type_logement.charAt(0).toUpperCase() + logement.type_logement.slice(1) : 'Studio';
  const villeLabel = logement.ville ? logement.ville.charAt(0).toUpperCase() + logement.ville.slice(1) : '';
  const photos = logement.photos || [];

  return (
    <div className="logement-page">
      {/* GALERIE PHOTOS */}
      <section className="photo-gallery">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <a
              onClick={(e) => { e.preventDefault(); window.history.back(); }}
              style={{ color: '#475569', fontSize: '13px', cursor: 'pointer', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#E8622A'}
              onMouseOut={(e) => e.currentTarget.style.color = '#475569'}
            >
              Retour
            </a>
            <a
              onClick={partagerAnnonce}
              style={{ color: shareHover ? '#E8622A' : '#475569', fontSize: '13px', cursor: 'pointer', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              onMouseOver={() => setShareHover(true)}
              onMouseOut={() => setShareHover(false)}
            >
              <ShareIcon />
              Partager
            </a>
          </div>

          <div className="main-photo">
            {showBadge && <span className="photo-badge">{badgeText}</span>}
            <button className={`favorite-btn-large${isFavorite ? ' is-favorite' : ''}`} onClick={toggleFavorite}>
              {isFavorite ? <HeartFull /> : <HeartEmpty />}
            </button>
            <span className="main-emoji-container">
              {mainPhoto ? (
                <img src={mainPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} alt={logement.titre || 'Photo du logement'} />
              ) : (
                <PlaceholderSvg size={80} />
              )}
            </span>
          </div>

          <div className="thumbnail-grid-wrapper">
            <div className="thumbnail-grid" ref={thumbnailGridRef}>
              {photos.length > 0 ? photos.map((photoUrl, index) => (
                <div key={index} className="thumbnail" style={{ cursor: 'pointer' }} onClick={() => setMainPhoto(photoUrl)}>
                  <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} alt={`Photo ${index + 1}`} />
                </div>
              )) : (
                [0, 1, 2, 3].map(i => (
                  <div key={i} className="thumbnail">
                    <PlaceholderSvg size={24} />
                  </div>
                ))
              )}
            </div>
            <div className={`scroll-hint-left${showScrollHintLeft ? ' visible' : ''}`}>
              <svg width="18" height="18" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </div>
            <div className={`scroll-hint${showScrollHintRight ? ' visible' : ''}`}>
              <svg width="18" height="18" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENU PRINCIPAL */}
      <div className="logement-content">
        {/* INFO PRINCIPALE */}
        <div className="main-info">
          <div className="logement-header lgt-stagger" style={{ animationDelay: '0.1s' }}>
            <div className="header-title-row">
              <h1>{logement.titre}</h1>
            </div>
            {villeLabel && <div className="logement-location">{villeLabel}</div>}
            <div className="quick-info">
              <div className="info-tag badge-type">{typeLabel}</div>
              <div className="info-tag">{logement.surface}m&sup2;</div>
              {logement.pieces && <div className="info-tag">{logement.pieces} {logement.pieces > 1 ? 'pièces' : 'pièce'}</div>}
              {logement.etage && <div className="info-tag">{logement.etage}</div>}
            </div>
          </div>

          {/* LOCALISATION + CARTE */}
          {logement.adresse && (
            <div className="localisation-section lgt-stagger" style={{ animationDelay: '0.2s' }}>
              <h2 className="section-title">Localisation</h2>

              {/* School search */}
              <div className="school-search-wrapper">
                <span className="school-search-icon"><SearchIcon /></span>
                <input
                  type="text"
                  className="school-search-input"
                  placeholder="Recherche ton école, université, CFA..."
                  autoComplete="off"
                  value={schoolQuery}
                  onChange={(e) => handleSchoolInput(e.target.value)}
                  onFocus={() => { if (schoolSuggestions.length > 0) setShowSuggestions(true); }}
                />
                {showSuggestions && (
                  <div className="school-suggestions visible">
                    {schoolSuggestions.length === 0 ? (
                      <div className="school-suggestion-item" style={{ color: '#94A3B8', cursor: 'default' }}>Aucun établissement trouvé</div>
                    ) : (
                      schoolSuggestions.map((item, i) => (
                        <div key={i} className="school-suggestion-item" onClick={() => selectSchool(item)}>
                          <strong>{item.name}</strong>
                          <small>{item.city}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Travel times */}
              {showTravelTimes && (
                <div className="travel-times">
                  <div className={`travel-mode${activeTravelMode === 'driving' ? ' active' : ''}`} onClick={() => switchTravelMode('driving')}>
                    <span className="travel-icon"><TravelDrivingSvg /></span>
                    <span className="travel-duration">{travelDriving}</span>
                  </div>
                  <div className={`travel-mode${activeTravelMode === 'transit' ? ' active' : ''}`} onClick={() => switchTravelMode('transit')}>
                    <span className="travel-icon"><TravelTransitSvg /></span>
                    <span className="travel-duration">{travelTransit}</span>
                  </div>
                  <div className={`travel-mode${activeTravelMode === 'cycling' ? ' active' : ''}`} onClick={() => switchTravelMode('cycling')}>
                    <span className="travel-icon"><TravelCyclingSvg /></span>
                    <span className="travel-duration">{travelCycling}</span>
                  </div>
                  <div className={`travel-mode${activeTravelMode === 'walking' ? ' active' : ''}`} onClick={() => switchTravelMode('walking')}>
                    <span className="travel-icon"><TravelWalkingSvg /></span>
                    <span className="travel-duration">{travelWalking}</span>
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="map-logement" ref={mapContainerRef} />
              <div style={{ background: '#E8EDF4', borderLeft: '3px solid #1E293B', borderRadius: '8px', padding: '8px 14px', marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500, lineHeight: 1.3 }}>
                  L&apos;adresse exacte est communiquée après signature du bail.
                </div>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          <div className="lgt-stagger" style={{ animationDelay: '0.3s' }}>
            <h2 className="section-title">Description</h2>
            <p className="description-text">
              {logement.description || 'Aucune description disponible.'}
            </p>
          </div>

          {/* EQUIPEMENTS */}
          {logement.equipements && logement.equipements.length > 0 && (
            <div className="lgt-stagger" style={{ animationDelay: '0.4s' }}>
              <h2 className="section-title">Équipements</h2>
              <div className="equipements-grid">
                {logement.equipements.map((equip, i) => (
                  <div key={i} className="equipement-item">
                    <span dangerouslySetInnerHTML={{ __html: getEquipementSvg(equip) }} />
                    {getEquipementLabel(equip)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REGLES DU LOGEMENT */}
          {logement.regles && logement.regles.length > 0 && logement.regles[0].trim() && (
            <div className="lgt-stagger" style={{ animationDelay: '0.5s' }}>
              <h2 className="section-title">Règles du logement</h2>
              <div className="regles-list">
                <div style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {logement.regles[0]}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR RESERVATION */}
        <aside className="booking-sidebar lgt-stagger" style={{ animationDelay: '0.2s' }}>
          {/* CARD PRINCIPALE : Prix + Dates + CTA */}
          <div className="booking-card">
            <div className="price-row">
              <span className="price-large">{logement.prix}&euro;</span>
              <span className="price-suffix">/ semaine</span>
            </div>

            <div className="sidebar-dates">
              <div className="sidebar-date-row">
                <span className="sidebar-date-label">Disponible du</span>
                <span className="sidebar-date-value">{dateDebut}</span>
              </div>
              <div className="sidebar-date-row">
                <span className="sidebar-date-label">Jusqu&apos;au</span>
                <span className="sidebar-date-value">{dateFin}</span>
              </div>
              <div className="sidebar-date-row">
                <span className="sidebar-date-label">Durée minimum</span>
                <span className="sidebar-date-value">{dureeMin}</span>
              </div>
            </div>

            {!dejaCandidateFlag ? (
              <button onClick={() => { setShowModalCandidature(true); setCandidatureMessage(''); }} className="btn-postuler">
                Postuler
              </button>
            ) : (
              <div style={{ display: 'block', padding: '12px', background: '#dcfce7', borderRadius: '10px', textAlign: 'center', color: '#166534', fontWeight: 600, marginTop: '10px', fontSize: '13px' }}>
                Tu as déjà postulé
              </div>
            )}
          </div>

          {/* CARD HOTE */}
          {hostData && (
            <div className="host-card">
              <a className="host-link" href="#" onClick={(e) => { e.preventDefault(); /* ouvrirProfilOverlay could be added */ }}>
                {hostData.type_user === 'hote' && hostData.photo_profil_url ? (
                  <img src={hostData.photo_profil_url} alt={hostData.prenom} className="host-avatar-small" />
                ) : (
                  <div className="host-avatar-small">
                    {(hostData.prenom.charAt(0) + hostData.nom.charAt(0)).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="host-name">{hostData.prenom} {hostData.nom.charAt(0)}.</div>
                  <div className="host-status-text">{hostData.type_user === 'hote' ? 'Hôte' : 'Propriétaire'}</div>
                </div>
              </a>
              <button className="btn-contacter-host" onClick={() => setShowModalMessage(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Contacter
              </button>
            </div>
          )}

          {/* CARD COUVERTURE (1b-i — badge texte, lecture seule, hors flux candidature) */}
          {profilVisiteurCharge && couvertureVisiteur && couvertureVisiteur.totalCherchees > 0 && (
            <div className="calendar-card">
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Couverture de tes semaines</div>
              <div style={{ fontSize: '14px', color: '#475569' }}>
                couvre <strong style={{ color: '#E8622A', fontWeight: 700 }}>{couvertureVisiteur.couvertes}</strong> de tes {couvertureVisiteur.totalCherchees} semaines
              </div>
            </div>
          )}

          {/* CARD CALENDRIER */}
          <div className="calendar-card">
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '12px' }}>Disponibilités</div>
            <div>
              {renderCalendar()}
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-color host-available" />
                  <span className="legend-text">Disponible</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color host-busy" />
                  <span className="legend-text">Occupé</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color user-selected" />
                  <span className="legend-text">Sélectionné</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Signaler */}
      <div style={{ textAlign: 'center', padding: '20px 0 40px 0', maxWidth: '960px', margin: '0 auto' }}>
        <a
          onClick={() => { setShowModalSignalement(true); setSignalMotif(''); setSignalDesc(''); setSignalMsg({ text: '', type: '' }); }}
          style={{ color: signalLinkHover ? '#E8622A' : '#475569', fontSize: '13px', cursor: 'pointer', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
          onMouseOver={() => setSignalLinkHover(true)}
          onMouseOut={() => setSignalLinkHover(false)}
        >
          Signaler cette annonce
        </a>
      </div>

      {/* MODAL CANDIDATURE */}
      {showModalCandidature && (
        <div className="logement-modal" role="dialog" aria-modal="true" aria-label="Postuler à ce logement" onClick={(e) => { if (e.target === e.currentTarget) setShowModalCandidature(false); }}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '32px 28px 28px' }}>
            <button className="modal-close" aria-label="Fermer" onClick={() => setShowModalCandidature(false)}>&times;</button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', background: 'rgba(232, 98, 42, 0.1)', borderRadius: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="24" height="24" fill="none" stroke="#E8622A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
              </div>
              <h2 style={{ marginBottom: '6px', fontSize: '20px' }}>Postuler à ce logement</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>Présente-toi au propriétaire en quelques lignes</p>
            </div>

            <form onSubmit={envoyerCandidature} aria-label="Formulaire de candidature">
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '8px', display: 'block' }}>Ton message de motivation</label>
                <textarea
                  value={messageCandidature}
                  onChange={(e) => setMessageCandidature(e.target.value)}
                  placeholder="Bonjour, je suis étudiant(e) en alternance et je recherche un logement. Ton annonce m'intéresse beaucoup car..."
                  required
                  minLength={50}
                  rows={5}
                  style={{ width: '100%', border: '1.5px solid #E8EAF0', borderRadius: '12px', padding: '14px 16px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", color: '#1E293B', resize: 'vertical', transition: 'border-color 0.2s', background: '#F4F5F7', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Minimum 50 caractères</span>
                  <span style={{ fontSize: '12px', color: messageCandidature.length >= 50 ? '#16A34A' : '#9CA3AF' }}>
                    {messageCandidature.length} / 50
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={candidatureSubmitting} style={{ width: '100%', height: '48px', fontSize: '15px', fontWeight: 600, borderRadius: '12px' }}>
                {candidatureSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', margin: '14px 0 0', lineHeight: 1.5 }}>
                Ton dossier complet sera partagé automatiquement
              </p>
            </form>

            {candidatureMessage && <div style={{ marginTop: '15px' }} dangerouslySetInnerHTML={{ __html: candidatureMessage }} />}
          </div>
        </div>
      )}

      {/* MODAL MESSAGE */}
      {showModalMessage && (
        <div className="logement-modal" role="dialog" aria-modal="true" aria-label="Envoyer un message" onClick={(e) => { if (e.target === e.currentTarget) setShowModalMessage(false); }}>
          <div className="modal-content">
            <button className="modal-close" aria-label="Fermer" onClick={() => setShowModalMessage(false)}>&times;</button>
            <h2 style={{ marginBottom: '10px' }}>Contacter le propriétaire</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Envoie un message direct</p>

            <form onSubmit={envoyerMessageHandler}>
              <div className="form-group">
                <label>Ton message</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Bonjour, j'ai une question concernant..."
                  required
                  rows={5}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={messageSubmitting} style={{ width: '100%' }}>
                {messageSubmitting ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>

            {messageConfirmation && <div style={{ marginTop: '15px' }} dangerouslySetInnerHTML={{ __html: messageConfirmation }} />}
          </div>
        </div>
      )}

      {/* MODAL SIGNALEMENT */}
      {showModalSignalement && (
        <div
          style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          role="dialog"
          aria-modal="true"
          aria-label="Signaler cette annonce"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModalSignalement(false); }}
        >
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 6px 28px rgba(232,98,42,0.10)', border: '1.5px solid #E8EAF0' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: '0 0 16px', textAlign: 'center' }}>Signaler cette annonce</h3>

            {signalMsg.text && (
              <div style={{
                padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', marginBottom: '12px',
                background: signalMsg.type === 'success' ? '#D1FAE5' : 'rgba(232,98,42,0.08)',
                color: signalMsg.type === 'success' ? '#065F46' : '#E8622A'
              }}>
                {signalMsg.text}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '5px' }}>Motif</label>
              <select
                value={signalMotif}
                onChange={(e) => setSignalMotif(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8EAF0', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: '#F4F5F7' }}
              >
                <option value="">-- Choisir un motif --</option>
                <option value="fausse_annonce">Fausse annonce</option>
                <option value="photos_trompeuses">Photos trompeuses</option>
                <option value="prix_incorrect">Prix incorrect</option>
                <option value="comportement_suspect">Comportement suspect du propriétaire</option>
                <option value="discrimination">Discrimination</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '5px' }}>Description (optionnel)</label>
              <textarea
                value={signalDesc}
                onChange={(e) => setSignalDesc(e.target.value)}
                rows={3}
                placeholder="Décris le problème..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8EAF0', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModalSignalement(false)} style={{ flex: 1, padding: '11px', background: '#fff', color: '#1E293B', border: '1.5px solid #E8EAF0', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
              <button onClick={envoyerSignalement} disabled={signalSubmitting} style={{ flex: 1, padding: '11px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {signalSubmitting ? 'Envoi...' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
