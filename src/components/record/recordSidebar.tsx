import { CornersButton, Sidebar, RecordButton, StopButton, FenButton, DeviceButton } from "../common";
import type {
  CanvasRef, CornersRef, ModelRefs, SetBoolean, SetStringArray, SidebarRef, VideoRef
} from "../../types";
import HandshakeControl from "./handshakeControl"; // CS3483 addition

const RecordSidebar = ({ piecesModelRef, xcornersModelRef, videoRef, canvasRef, sidebarRef, 
  playing, setPlaying, text, setText, cornersRef }: {
  piecesModelRef: ModelRefs["piecesModelRef"],
  xcornersModelRef: ModelRefs["xcornersModelRef"],
  videoRef: VideoRef,
  canvasRef: CanvasRef,
  sidebarRef: SidebarRef,
  playing: boolean, setPlaying: SetBoolean, 
  text: string[], setText: SetStringArray,
  cornersRef: CornersRef
}) => {
  const inputStyle = {
    display: playing ? "none": "inline-block"
  }
  return (
    <Sidebar sidebarRef={sidebarRef} playing={playing} text={text} setText={setText} >
      <li className="my-1" style={inputStyle}>
        <DeviceButton videoRef={videoRef} />
      </li>
      <li className="my-1" style={inputStyle}>
        <CornersButton piecesModelRef={piecesModelRef} xcornersModelRef={xcornersModelRef} videoRef={videoRef} canvasRef={canvasRef} 
        setText={setText} />
      </li>
      <li className="my-1" style={inputStyle}>
        <FenButton piecesModelRef={piecesModelRef} videoRef={videoRef} 
        canvasRef={canvasRef} setText={setText} cornersRef={cornersRef} />
      </li>
      <li className="my-1">
        <div className="btn-group w-100" role="group" aria-label="Move detection controls">
          <RecordButton playing={playing} setPlaying={setPlaying} />
          <StopButton setPlaying={setPlaying} setText={setText} />
        </div>
      </li>
      {/* CS3483 addition: handshake gesture to start / end the game */}
      <HandshakeControl videoRef={videoRef} cornersRef={cornersRef} playing={playing}
        setPlaying={setPlaying} setText={setText} />
    </Sidebar>
  );
};

export default RecordSidebar;
