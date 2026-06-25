import React from 'react';
import { useFCM } from '../../hooks/useFCM';

export const FCMHandler: React.FC = () => {
  useFCM();
  return null;
};
