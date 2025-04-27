// src/popup/components/StatusMessage.tsx - Status and error message component

import React from 'react';
import { useStatus, useError } from '../state/selectors';

interface StatusMessageProps {
  customStatus?: string | null;
  customError?: string | null;
}

/**
 * Status and error message component
 * Can use global state or custom messages
 */
const StatusMessage: React.FC<StatusMessageProps> = ({ 
  customStatus, 
  customError 
}) => {
  // Get from store if not provided as props
  const globalStatus = useStatus();
  const globalError = useError();
  
  // Use custom values if provided, otherwise use global state
  const status = customStatus !== undefined ? customStatus : globalStatus;
  const error = customError !== undefined ? customError : globalError;
  
  return (
    <>
      {status && <div className="status-message">{status}</div>}
      {error && <div className="error-message">{error}</div>}
    </>
  );
};

export default StatusMessage;
