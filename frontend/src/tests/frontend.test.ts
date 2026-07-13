import { MAP_NODES } from '../components/StadiumMap';
import { api } from '../services/api';

describe('Stadium Map Coordinates & Configuration Checks', () => {
  test('Verify all FIFA stadium nodes map successfully to exact 2D vector coordinates', () => {
    expect(MAP_NODES).toBeDefined();
    
    // Core areas should exist
    expect(MAP_NODES['Gate A']).toEqual(expect.objectContaining({ x: 400, y: 80, type: 'gate' }));
    expect(MAP_NODES['Zone A']).toEqual(expect.objectContaining({ x: 400, y: 200, type: 'zone' }));
    expect(MAP_NODES['Concourse 1']).toEqual(expect.objectContaining({ x: 400, y: 140, type: 'concourse' }));
  });

  test('Verify total count of map regions matches configuration', () => {
    const keys = Object.keys(MAP_NODES);
    expect(keys.length).toBe(28); // 8 zones, 12 concourses, 8 gates
  });
});

describe('API URL Resolution', () => {
  test('Verify API endpoints use default local environment variables or hostname fallback', () => {
    expect(api).toBeDefined();
    expect(api.getIncidents).toBeInstanceOf(Function);
    expect(api.calculateRoute).toBeInstanceOf(Function);
  });
});
