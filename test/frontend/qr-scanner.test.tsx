/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: mockBack }),
}));

const mockCheckInTicket = jest.fn();
jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  checkInTicket: (...args: unknown[]) => mockCheckInTicket(...args),
}));

const mockUseAuth = jest.fn(() => ({ isAdmin: true }));
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import QRScannerScreen from '../../src/frontend/mobile/app/qr-scanner';

describe('QRScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects when not admin', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    render(<QRScannerScreen />);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows scanning UI when admin with camera permission', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<QRScannerScreen />);

    await waitFor(() => {
      expect(screen.getByText('Point camera at ticket QR code')).toBeTruthy();
      expect(screen.getByText('Scan one ticket at a time')).toBeTruthy();
    });
  });

  it('calls checkInTicket when scan trigger is clicked', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockCheckInTicket.mockResolvedValue({ success: false, error: 'test' });

    render(<QRScannerScreen />);

    await waitFor(() => expect(screen.getByTestId('mock-scan-trigger')).toBeTruthy());
    fireEvent.click(screen.getByTestId('mock-scan-trigger'));

    await waitFor(() => {
      expect(mockCheckInTicket).toHaveBeenCalledWith('1:5:10:mock-signature');
    });
  });

});
