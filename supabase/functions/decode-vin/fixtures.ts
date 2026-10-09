import type { VpicResult } from './map.ts';

/** Trimmed real vPIC responses (DecodeVinValuesExtended), kept to the fields we read. */
export const BMW_X5_2021: VpicResult = {
  VIN: '5UXCR6C05M9F12345',
  ErrorCode: '0',
  ErrorText: '0 - VIN decoded clean. Check Digit (9th position) is correct',
  Make: 'BMW',
  Model: 'X5',
  ModelYear: '2021',
  Trim: 'xDrive40i',
  BodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)',
  DriveType: 'AWD/All-Wheel Drive',
  TransmissionStyle: 'Automatic',
  FuelTypePrimary: 'Gasoline',
  FuelTypeSecondary: '',
  ElectrificationLevel: '',
  EngineCylinders: '6',
  DisplacementL: '2.998832712',
  EngineHP: '335',
  EngineModel: 'B58B30O1',
  Turbo: 'Yes',
  Doors: '4',
  Seats: '5',
};

export const TOYOTA_PRIUS_PRIME: VpicResult = {
  ErrorCode: '0',
  Make: 'TOYOTA',
  Model: 'Prius Prime',
  ModelYear: '2022',
  Trim: 'LE',
  BodyClass: 'Hatchback/Liftback/Notchback',
  DriveType: 'FWD/Front-Wheel Drive',
  TransmissionStyle: 'Continuously Variable Transmission (CVT)',
  FuelTypePrimary: 'Gasoline',
  FuelTypeSecondary: 'Electric',
  ElectrificationLevel: 'PHEV (Plug-in Hybrid Electric Vehicle)',
  EngineCylinders: '4',
  DisplacementL: '1.8',
  Doors: '5',
};

export const TESLA_MODEL_3: VpicResult = {
  ErrorCode: '0',
  Make: 'TESLA',
  Model: 'Model 3',
  ModelYear: '2023',
  BodyClass: 'Sedan/Saloon',
  DriveType: 'RWD/Rear-Wheel Drive',
  FuelTypePrimary: 'Electric',
  ElectrificationLevel: 'BEV (Battery Electric Vehicle)',
  EngineCylinders: '',
  DisplacementL: '',
  Seats: '5',
};

export const UNDECODABLE: VpicResult = {
  ErrorCode: '7,11',
  ErrorText: '7 - Manufacturer is not registered with NHTSA; 11 - Incorrect Model Year',
  Make: '',
  Model: '',
  ModelYear: '',
};
