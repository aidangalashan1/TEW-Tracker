import closeIcon from '../assets/UI icons/close.png'
import trackerLogo from '../assets/TrackerLogo.png'
import { popoutTitle, popoutWindowControl } from '../lib/popout'

/** Popout windows are frameless (frame:false in electron/main.js), same as
 *  the main window, so they read as part of this app rather than a bare OS
 *  window — which means this bar (not the OS) supplies the drag region and
 *  the minimize/maximize/close controls the native titlebar would otherwise
 *  have given for free. `-webkit-app-region: drag` on the bar itself makes
 *  it draggable; each interactive child needs `no-drag` back or clicks on
 *  them would just drag the window instead of firing. */
export function PopoutTitleBar() {
  return (
    <div className="popout-titlebar">
      <div className="popout-titlebar-drag">
        <img src={trackerLogo} alt="" className="popout-titlebar-logo" />
        <span className="popout-titlebar-label">{popoutTitle || 'TEW Tracker'}</span>
      </div>
      <div className="popout-titlebar-controls">
        <button className="popout-titlebar-btn" title="Minimize" onClick={() => popoutWindowControl('minimize')}>
          <span className="popout-titlebar-minimize" />
        </button>
        <button className="popout-titlebar-btn" title="Maximize / Restore" onClick={() => popoutWindowControl('maximize')}>
          <span className="popout-titlebar-maximize" />
        </button>
        <button className="popout-titlebar-btn popout-titlebar-btn-close" title="Close" onClick={() => popoutWindowControl('close')}>
          <img src={closeIcon} alt="" style={{ width: 13, height: 13, filter: 'brightness(0) invert(1)' }} />
        </button>
      </div>
    </div>
  )
}
