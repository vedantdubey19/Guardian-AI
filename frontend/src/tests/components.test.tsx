import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('Header Component', () => {
  const mockTelemetry = {
    timestamp: new Date().toISOString(),
    densities: {},
    counts: {},
    responders: [],
    overall_risk_score: 15.0,
    overall_confidence: 90.0,
    phase: 'ingress',
    simulation_time: 10,
    total_visitors: 15000,
    system_health: 'nominal' as const,
  };

  test('renders Header with nominal health and risk score', () => {
    render(<Header telemetry={mockTelemetry} activeIncidentsCount={2} />);
    
    // Verify title is rendered
    expect(screen.getByText('Stadium Command Center')).toBeInTheDocument();
    
    // Verify phase is shown
    expect(screen.getByText('Spectator Ingress')).toBeInTheDocument();

    // Verify overall risk score is rendered
    expect(screen.getByText('15%')).toBeInTheDocument();

    // Verify system health status
    expect(screen.getByText('System Nominal')).toBeInTheDocument();

    // Verify active incidents count
    expect(screen.getByText('2 Active Alerts')).toBeInTheDocument();
  });

  test('renders Header with degraded status and zero active alerts', () => {
    const degradedTelemetry = { ...mockTelemetry, system_health: 'degraded' as const, overall_risk_score: 65.0 };
    render(<Header telemetry={degradedTelemetry} activeIncidentsCount={0} />);

    // Verify degraded message
    expect(screen.getByText('System Degraded')).toBeInTheDocument();

    // Verify zero alerts message
    expect(screen.getByText('0 Active Alerts')).toBeInTheDocument();
  });
});

describe('Sidebar Component', () => {
  test('renders Sidebar branding and navigation links', () => {
    render(<Sidebar />);
    
    // Verify brand title
    expect(screen.getByText('GUARDIAN AI')).toBeInTheDocument();
    
    // Verify navigation items
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Live Command')).toBeInTheDocument();
    expect(screen.getByText('AI Copilot')).toBeInTheDocument();
    expect(screen.getByText('Prediction Center')).toBeInTheDocument();
    expect(screen.getByText('Emergency Room')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  test('marks the active navigation link with aria-current', () => {
    render(<Sidebar />);
    
    // Mocked pathname in navigation is '/dashboard'
    // 'Live Command' points to '/dashboard'
    const liveCommandLink = screen.getByText('Live Command').closest('a');
    expect(liveCommandLink).toHaveAttribute('aria-current', 'page');
    
    // 'Overview' points to '/' and should not have aria-current='page'
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink).not.toHaveAttribute('aria-current');
  });
});
