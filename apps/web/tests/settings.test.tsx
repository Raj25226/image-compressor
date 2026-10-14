// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CompressionSettings } from '../components/CompressionSettings';
afterEach(cleanup);
const props = () => ({ target:'100',setTarget:vi.fn(),format:'auto' as const,setFormat:vi.fn(),resize:true,setResize:vi.fn(),maxWidth:'',setMaxWidth:vi.fn(),maxHeight:'',setMaxHeight:vi.fn(),disabled:false });
describe('compression controls', () => {
  it('presets change target and expose selected state', () => { const config=props(); render(<CompressionSettings {...config}/>); fireEvent.click(screen.getByRole('button',{name:'50 KB'})); expect(config.setTarget).toHaveBeenCalledWith('50'); expect(screen.getByRole('button',{name:'100 KB'})).toHaveAttribute('aria-pressed','true'); });
  it('allows custom target input', () => { const config=props(); render(<CompressionSettings {...config}/>); fireEvent.change(screen.getByLabelText('Target file size'),{target:{value:'75'}}); expect(config.setTarget).toHaveBeenCalledWith('75'); });
  it('warns about transparency before selecting JPEG output', () => { render(<CompressionSettings {...props()} format="image/jpeg"/>); expect(screen.getByText(/JPEG removes transparency/)).toBeVisible(); });
  it('allows disabling resizing', () => { const config=props(); render(<CompressionSettings {...config}/>); fireEvent.click(screen.getByRole('checkbox')); expect(config.setResize).toHaveBeenCalledWith(false); });
});
