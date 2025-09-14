import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import { project } from '../src/renderer/lib/project';

describe('project (YAML → Grid)', () => {
  it('projects communication_requirements.sample.yaml into a grid with at least one row/column', () => {
    const p = path.join(process.cwd(), 'samples', 'communication_requirements.sample.yaml');
    const text = fs.readFileSync(p, 'utf8');
    const ast = YAML.parse(text);
    const grid = project(ast);
    expect(grid.columns.length).toBeGreaterThan(0);
    expect(grid.rows.length).toBeGreaterThan(0);
    // Expect top-level key "要件" to become a column
    const colKeys = grid.columns.map(c => c.key);
    expect(colKeys).toContain('要件');
    // And the cell value for 要件 is an array (the requirements list)
    const cell = grid.rows[0].cells['要件'];
    expect(Array.isArray(cell?.value)).toBe(true);
  });

  it('projects array-of-objects as multiple rows', () => {
    const ast = YAML.parse(`
    - id: 1
      name: Alice
    - id: 2
      name: Bob
    `);
    const grid = project(ast);
    expect(grid.rows.length).toBe(2);
    const keys = grid.columns.map(c => c.key);
    expect(keys).toContain('id');
    expect(keys).toContain('name');
  });
});

