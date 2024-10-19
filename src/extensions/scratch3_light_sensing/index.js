const Runtime = require('../../engine/runtime');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const Video = require('../../io/video');
const log = require('../../util/log');
const cv = require('./opencv.js');
const StageLayering = require('../../engine/stage-layering');

//定数
const DEFAULT_BRIGHT_LEBEL = 240; //2値化の敷居値
const DEFAULT_DETECT_SIZE = 100; //検出サイズ
const LOG_OUT = 0; //ログ出力切り替え

// カラー番号に対応するRGB値を定義
const COLOR_LIST = [
    new cv.Scalar(255, 0, 0, 255),  // 1: 青
    new cv.Scalar(0, 255, 0, 255),  // 2: 緑
    new cv.Scalar(0, 0, 255, 255),  // 3: 赤
    new cv.Scalar(255, 255, 0, 255), // 4: シアン
    new cv.Scalar(255, 0, 255, 255), // 5: マゼンタ
    new cv.Scalar(0, 255, 255, 255), // 6: イエロー
    new cv.Scalar(128, 128, 128, 255), // 8: グレー
    new cv.Scalar(128, 0, 128, 255),   // 9: パープル
    new cv.Scalar(128, 128, 0, 255)    
]

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjBweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudTwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxnIGlkPSJFeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctTWVudSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDUuMDAwMDAwKSIgZmlsbC1ydWxlPSJub256ZXJvIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjI1IiBjeD0iMTYiIGN5PSI4IiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjMEVCRDhDIiBvcGFjaXR5PSIwLjUiIGN4PSIxNiIgY3k9IjYiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiMwRUJEOEMiIG9wYWNpdHk9IjAuNzUiIGN4PSIxNiIgY3k9IjQiIHI9IjIiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsIiBmaWxsPSIjMEVCRDhDIiBjeD0iMTYiIGN5PSIyIiByPSIyIj48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTExLjMzNTk3MzksMi4yMDk3ODgyNSBMOC4yNSw0LjIwOTk1NjQ5IEw4LjI1LDMuMDUgQzguMjUsMi4wNDQ4ODIyNyA3LjQ2ODU5MDMxLDEuMjUgNi41LDEuMjUgTDIuMDUsMS4yNSBDMS4wMzgwNzExOSwxLjI1IDAuMjUsMi4wMzgwNzExOSAwLjI1LDMuMDUgTDAuMjUsNyBDMC4yNSw3Ljk2MzY5OTM3IDEuMDQyMjQ5MTksOC43NTU5NDg1NiAyLjA1LDguOCBMNi41LDguOCBDNy40NTA4MzAwOSw4LjggOC4yNSw3Ljk3MzI3MjUgOC4yNSw3IEw4LjI1LDUuODU4NDUyNDEgTDguNjI4NjIzOTQsNi4wODU2MjY3NyBMMTEuNDI2Nzc2Nyw3Ljc3MzIyMzMgQzExLjQzNjg5NDMsNy43ODMzNDA5MSAxMS40NzU3NjU1LDcuOCAxMS41LDcuOCBDMTEuNjMzNDkzMiw3LjggMTEuNzUsNy42OTEyNjAzNCAxMS43NSw3LjU1IEwxMS43NSwyLjQgQzExLjc1LDIuNDE4MzgyNjkgMTEuNzIxOTAyOSwyLjM1MjgyMjgyIDExLjY4NTYyNjgsMi4yNzg2MjM5NCBDMTEuNjEyOTUyOCwyLjE1NzUwMDY5IDExLjQ3MDc5NjgsMi4xMjkwNjk1IDExLjMzNTk3MzksMi4yMDk3ODgyNSBaIiBpZD0idmlkZW9fMzdfIiBzdHJva2Utb3BhY2l0eT0iMC4xNSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjAuNSIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iNDBweCIgaGVpZ2h0PSI0MHB4IiB2aWV3Qm94PSIwIDAgNDAgNDAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjIgKDY3MTQ1KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL1NvZnR3YXJlL1ZpZGVvLVNlbnNpbmctQmxvY2s8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iRXh0ZW5zaW9ucy9Tb2Z0d2FyZS9WaWRlby1TZW5zaW5nLUJsb2NrIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2Utb3BhY2l0eT0iMC4xNSI+CiAgICAgICAgPGcgaWQ9InZpZGVvLW1vdGlvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDEwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjMDAwMDAwIj4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjE2IiByPSI0LjUiPjwvY2lyY2xlPgogICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjeD0iMzIiIGN5PSIxMiIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPGNpcmNsZSBpZD0iT3ZhbC1Db3B5IiBmaWxsPSIjRkZGRkZGIiBvcGFjaXR5PSIwLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGN4PSIzMiIgY3k9IjgiIHI9IjQuNSI+PC9jaXJjbGU+CiAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY3g9IjMyIiBjeT0iNCIgcj0iNC41Ij48L2NpcmNsZT4KICAgICAgICAgICAgPHBhdGggZD0iTTIyLjY3MTk0NzcsNC40MTk1NzY0OSBMMTYuNSw4LjQxOTkxMjk4IEwxNi41LDYuMSBDMTYuNSw0LjA4OTc2NDU0IDE0LjkzNzE4MDYsMi41IDEzLDIuNSBMNC4xLDIuNSBDMi4wNzYxNDIzNywyLjUgMC41LDQuMDc2MTQyMzcgMC41LDYuMSBMMC41LDE0IEMwLjUsMTUuOTI3Mzk4NyAyLjA4NDQ5ODM5LDE3LjUxMTg5NzEgNC4xLDE3LjYgTDEzLDE3LjYgQzE0LjkwMTY2MDIsMTcuNiAxNi41LDE1Ljk0NjU0NSAxNi41LDE0IEwxNi41LDExLjcxNjkwNDggTDIyLjc1NzI0NzksMTUuNDcxMjUzNSBMMjIuODUzNTUzNCwxNS41NDY0NDY2IEMyMi44NzM3ODg2LDE1LjU2NjY4MTggMjIuOTUxNTMxLDE1LjYgMjMsMTUuNiBDMjMuMjY2OTg2NSwxNS42IDIzLjUsMTUuMzgyNTIwNyAyMy41LDE1LjEgTDIzLjUsNC44IEMyMy41LDQuODM2NzY1MzggMjMuNDQzODA1OCw0LjcwNTY0NTYzIDIzLjM3MTI1MzUsNC41NTcyNDc4OCBDMjMuMjI1OTA1Niw0LjMxNTAwMTM5IDIyLjk0MTU5MzcsNC4yNTgxMzg5OSAyMi42NzE5NDc3LDQuNDE5NTc2NDkgWiIgaWQ9InZpZGVvXzM3XyIgZmlsbD0iIzRENEQ0RCI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+';

const Message = {
    on: {
        'ja': '入',
        'ja-Hira': 'いり',
        'en': 'on'
      },
    off: {
        'ja': '切',
        'ja-Hira': 'きり',
        'en': 'off',
      },
    getX: {
        'ja': '[OBJECT_NUMBER] 個目のx座標',
        'ja-Hira': '[OBJECT_NUMBER] こめのxざひょう',
        'en': 'x of light no. [OBJECT_NUMBER]'
      },
    getY: {
        'ja': '[OBJECT_NUMBER] 個目のy座標',
        'ja-Hira': '[OBJECT_NUMBER] こめのyざひょう',
        'en': 'y of light no. [OBJECT_NUMBER]'
      },
    objectCount: {
        'ja': 'ライトの数',
        'ja-Hira': 'ライトのかず',
        'en': 'light count'
    },
    analyzeImageShowToggle: {
        'ja': 'カイセキ表示を [ANALYZE_IMAGE_SHOW_STATE] にする',
        'ja-Hira': 'カイセキひょうじを [ANALYZE_IMAGE_SHOW_STATE] にする',
        'en': 'analyze image show [ANALYZE_IMAGE_SHOW_STATE]'
    },
    brightLevel: {
        'ja': 'ライトの明るさを [BRIGHT_LEBEL] にする',
        'ja-Hira': 'ライトのあかるさを [BRIGHT_LEBEL] にする',
        'en': 'Set Bright Level [BRIGHT_LEBEL]'
    },
    detectSize: {
        'ja': '[DETECT_SIZE] より大きなライトを見つける',
        'ja-Hira': '[DETECT_SIZE] よりおおきなライトをみつける',
        'en': 'Set Pattern Detect Size [DETECT_SIZE]'
    },
    setVideoTransparency: {
        'ja': 'ビデオの透明度を [TRANSPARENCY] にする',
        'ja-Hira': 'ビデオのとうめいどを [TRANSPARENCY] にする',
        'en': 'set video transparency to [TRANSPARENCY]'
    },
    videoToggle: {
        'ja': 'ビデオを [VIDEO_STATE] にする',
        'ja-Hira': 'ビデオを [VIDEO_STATE] にする',
        'en': 'turn video [VIDEO_STATE]'
    },
}  

const AvailableLocales = ['en', 'ja', 'ja-Hira'];

/**
 * States the video sensing activity can be set to.
 * @readonly
 * @enum {string}
 */
const VideoState = {
    /** Video turned off. */
    OFF: 'off',

    /** Video turned on with default y axis mirroring. */
    ON: 'on',

    /** Video turned on without default y axis mirroring. */
    ON_FLIPPED: 'on-flipped'
};

const AnayzeImageShowState = {
    OFF: 'off',
    ON: 'on'
};

//検出オブジェクト定義
class DetectObject {
    constructor(x, y, area, edgenum, color) {
      this.x = x;
      this.y = y;
      this.area = area;
      this.edgenum = edgenum;
      this.color = color;
    }
    print(){
        log.log(`x:${this.x} y:${this.y} area:${this.area} edgenum:${this.edgenum} color=${this.color}`);
    }
}

class Scratch3LightSensingBlocks {

    get OBJECT_NUMBER_MENU () {
        return [
            {
                text: '1',
                value: '1'
            },
            {
                text: '2',
                value: '2'
            },
            {
                text: '3',
                value: '3'
            },
            {
                text: '4',
                value: '4'
            },
            {
                text: '5',
                value: '5'
            },
            {
                text: '6',
                value: '6'
            },
            {
                text: '7',
                value: '7'
            },
            {
                text: '8',
                value: '8'
            },
            {
                text: '9',
                value: '9'
            },
            {
                text: '10',
                value: '10'
            }
        ]
      }

    get ANALYZE_IMAGE_SHOW_STATE_MENU () {
        return [
            {
                text: Message.off[this.locale],
                value: '0'
            },
            {
                text: Message.on[this.locale],
                value: '1'
            }
        ]
    }

    /**
     * An array of info on video state options for the "turn video [STATE]" block.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the video state menu
     * @param {string} value - the serializable value stored in the block
     */
    get VIDEO_STATE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.off',
                    default: 'off',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.OFF
            },
            {
                name: formatMessage({
                    id: 'videoSensing.on',
                    default: 'on',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.ON
            },
            {
                name: formatMessage({
                    id: 'videoSensing.onFlipped',
                    default: 'on flipped',
                    description: 'Option for the "turn video [STATE]" block that causes the video to be flipped' +
                        ' horizontally (reversed as in a mirror)'
                }),
                value: VideoState.ON_FLIPPED
            }
        ];
    }

    constructor (runtime) {
        //ランタイム設定
        this.runtime = runtime;
        //オブジェクトの初期化
        this.objects = [];
        //ロケール設定
        this.locale = this.setLocale();
        //二値化の明るさレベル
        this.globalBrightLevel = DEFAULT_BRIGHT_LEBEL;
        //模様検出のサイズ
        this.globalDetectSize = DEFAULT_DETECT_SIZE;
        //解析画像の表示の切り替えフラグ
        this.globalAnalyzeImageShowFg = 0;
        //ビットマップ画像のskinのid
        this.skinId =0; 
    
        if (runtime.formatMessage) {
            // Replace 'formatMessage' to a formatter which is used in the runtime.
            formatMessage = runtime.formatMessage;
        }
        this._lastUpdate = null;
        this.firstInstall = true;

        if (this.runtime.ioDevices) {
            // Configure the video device with values from globally stored locations.
            this.runtime.on(Runtime.PROJECT_LOADED, this.updateVideoDisplay.bind(this));

            // Clear target motion state values when the project starts.
            this.runtime.on(Runtime.PROJECT_RUN_START, this.reset.bind(this));
            
            //this.drawableIDをここで作ってみる。
            this.drawableID = this.runtime.renderer.createDrawable("video");
          
            // Kick off looping the analysis logic.
            this._loop();
        }
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 33;
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }
   
    /**
     * The transparency setting of the video preview stored in a value
     * accessible by any object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoTransparency () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoTransparency;
        }
        return 50;
    }

    set globalVideoTransparency (transparency) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoTransparency = transparency;
        }
    }

    /**
     * The video state of the video preview stored in a value accessible by any
     * object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoState () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoState;
        }
        // Though the default value for the stage is normally 'on', we need to default
        // to 'off' here to prevent the video device from briefly activating
        // while waiting for stage targets to be installed that say it should be off
        return VideoState.OFF;
    }

    set globalVideoState (state) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoState = state;
        }
    }

    /**
     * Get the latest values for video transparency and state,
     * and set the video device to use them.
     */
    updateVideoDisplay () {
        this.setVideoTransparency({
            TRANSPARENCY: this.globalVideoTransparency
        });
        this.videoToggle({
            VIDEO_STATE: this.globalVideoState
        });
    }

    /**
     * Reset the extension's data motion detection data. This will clear out
     * for example old frames, so the first analyzed frame will not be compared
     * against a frame from before reset was called.
     */
    reset () {
        //this.detect.reset();
        /*
        const targets = this.runtime.targets;
        for (let i = 0; i < targets.length; i++) {
            const state = targets[i].getCustomState(Scratch3VideoSensingBlocks.STATE_KEY);
            if (state) {
                state.motionAmount = 0;
                state.motionDirection = 0;
            }
        }*/
    }

    //画像解析処理
    _analyzeImage(frame){
        if (!this.runtime.renderer) {
            log.log("error no renderer.");
            return;
        }
    
        //フレーム取得
        let src = cv.matFromImageData(frame);
        let gray = new cv.Mat();
        //グレー変換
        cv.cvtColor(src,gray,cv.COLOR_RGB2GRAY);
        //バイナリ変換
        let dst = new cv.Mat();
        cv.threshold(gray, dst, this.globalBrightLevel, 255, cv.THRESH_BINARY);
        //輪郭抽出
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        // 輪郭を全部見つけ出す
        cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_TC89_L1);
        //console.log("contours=", contours.size());
        //デバック用 dstに結果を描画するためRGBに戻す。
        cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA)
        //リストを削除
        this.objects.length = 0;
        for (let i = 0; i < contours.size(); i++) {
            // ある程度のサイズ以上の輪郭のみ処理
            const area = cv.contourArea(contours.get(i), false);
            //console.log("i=",i, " area=",area);
            //サイズが大きいもののみを対応する. 
            if (area > this.globalDetectSize) {
                if(LOG_OUT){
                    console.log("i=",i, " area=",area);
                }
                // cv.Matは行列で、幅1, 高さ4のものが4頂点に近似できた範囲になる
                let approx = new cv.Mat();
                cv.approxPolyDP(contours.get(i), approx, 0.02 * cv.arcLength(contours.get(i), true), true);
                
                for (let i = 0; i < approx.rows; i++) {
                    let point = approx.data32S[i * 2] + ', ' + approx.data32S[i * 2 + 1];
                    if(LOG_OUT){
                        console.log('Point ' + i + ': ' + point);
                    }
                    //cv.circle(dst, new cv.Point(approx.data32S[i * 2], approx.data32S[i * 2 + 1]), 10, new cv.Scalar(0, 0, 255, 255), -1);
                    cv.circle(dst, new cv.Point(approx.data32S[i * 2], approx.data32S[i * 2 + 1]),3, COLOR_LIST[this.objects.length%9], -1);
              
                }
                
                let moments = cv.moments(contours.get(i), false);
                let cx = parseInt(moments.m10 / moments.m00);
                let cy = parseInt(moments.m01 / moments.m00);
                let object = new DetectObject(cx-frame.width/2, frame.height/2-cy, area, 0, 0);
                
                //object.print();
                this.objects.push(object);
                approx.delete();
            }
        }
        contours.delete();
        hierarchy.delete();
       
        //結果画面表示
        if(this.globalAnalyzeImageShowFg==1){
            const imageData = new ImageData(new Uint8ClampedArray(dst.data, dst.cols, dst.rows), frame.width, frame.height);
            //bitmapskinのupdateはないため、一度、skinを削除する。
            if(this.skinId!=0){
                this.runtime.renderer.destroySkin(this.skinId);
            }
            this.skinId = this.runtime.renderer.createBitmapSkin(imageData,1);
            this.runtime.renderer.updateDrawableProperties( this.drawableID, {
                        skinId: this.skinId,  visible: true });
            //うまく、解析画像の透過色を調整できず。
            //this.runtime.renderer.updateDrawableProperties( this.drawableID, {
            //    effects: {ghost: this.globalVideoTransparency}});
    
        }else{
            this.runtime.renderer.updateDrawableProperties( this.drawableID, {
                visible: false
            });
        }
        
        src.delete();
        dst.delete();
    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a TypedArray copy of the canvas's pixel data.
     * @private
     */
    _loop () {
        const loopTime = Math.max(this.runtime.currentStepTime, Scratch3LightSensingBlocks.INTERVAL);
        this._loopInterval = setTimeout(this._loop.bind(this), loopTime);

        // Add frame to detector
        const time = Date.now();
        if (this._lastUpdate === null) {
            this._lastUpdate = time;
        }
        const offset = time - this._lastUpdate;
        if (offset > Scratch3LightSensingBlocks.INTERVAL) {
            const frame = this.runtime.ioDevices.video.getFrame({
                format: Video.FORMAT_IMAGE_DATA,
                dimensions: Scratch3LightSensingBlocks.DIMENSIONS
            });

            //画像解析処理
            if(frame){
                this._analyzeImage(frame);
                this._lastUpdate = time;
            }
        }
    }

    /**
     * Create data for a menu in scratch-blocks format, consisting of an array
     * of objects with text and value properties. The text is a translated
     * string, and the value is one-indexed.
     * @param {object[]} info - An array of info objects each having a name
     *   property.
     * @return {array} - An array of objects with text and value properties.
     * @private
     */
    
    _buildMenu (info) {
        return info.map((entry, index) => {
            const obj = {};
            obj.text = entry.name;
            obj.value = entry.value || String(index + 1);
            return obj;
        });
    }

    /**
     * States the video sensing activity can be set to.
     * @readonly
     * @enum {string}
     */
    static get VideoState () {
        return VideoState;
    }

    
    getInfo () {
        this.locale = this.setLocale();

        // Set the video display properties to defaults the first time
        // getInfo is run. This turns on the video device when it is
        // first added to a project, and is overwritten by a PROJECT_LOADED
        // event listener that later calls updateVideoDisplay
        if (this.firstInstall) {
            this.globalVideoState = VideoState.ON;
            this.globalVideoTransparency = 50;
            this.updateVideoDisplay();
            this.firstInstall = false;
        }

        // Return extension definition
        return {
            id: 'lightSensing',
            name: formatMessage({
                id: 'lightSensing.categoryName',
                default: 'ライトセンサー',
                description: 'カメラでライトを見つける'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'getX',
                    blockType: BlockType.REPORTER,
                    text: Message.getX[this.locale],
                    arguments: {
                        OBJECT_NUMBER: {
                            type: ArgumentType.STRING,
                            menu: 'OBJECT_NUMBER',
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'getY',
                    blockType: BlockType.REPORTER,
                    text: Message.getY[this.locale],
                    arguments: {
                        OBJECT_NUMBER: {
                            type: ArgumentType.STRING,
                            menu: 'OBJECT_NUMBER',
                            defaultValue: '1'
                        }
                    }
                },
                {   opcode: 'getObjectCount',
                    blockType: BlockType.REPORTER,
                    text: Message.objectCount[this.locale]
                },
                {
                    opcode: 'analyzeImageShowToggle',
                    text: Message.analyzeImageShowToggle[this.locale],
                    arguments: {
                        ANALYZE_IMAGE_SHOW_STATE: {
                            type: ArgumentType.NUMBER,
                            menu: 'ANALYZE_IMAGE_SHOW_STATE',
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'setBrightLevel',
                    text: Message.brightLevel[this.locale],
                    arguments: {
                        BRIGHT_LEBEL: {
                            type: ArgumentType.NUMBER,
                            defaultValue: DEFAULT_BRIGHT_LEBEL
                        }
                    }
                },
                {
                    opcode: 'setDetectSize',
                    text: Message.detectSize[this.locale],
                    arguments: {
                        DETECT_SIZE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: DEFAULT_DETECT_SIZE
                        }
                    }
                },
                {
                    opcode: 'videoToggle',
                    text: Message.videoToggle[this.locale],
                    //text: formatMessage({
                    //    id: 'videoSensing.videoToggle',
                    //    default: 'turn video [VIDEO_STATE]',
                    //    description: 'Controls display of the video preview layer'
                    //}),
                    arguments: {
                        VIDEO_STATE: {
                            type: ArgumentType.NUMBER,
                            menu: 'VIDEO_STATE',
                            defaultValue: VideoState.ON
                        }
                    }
                },

                {
                    opcode: 'setVideoTransparency',
                    text: Message.setVideoTransparency[this.locale],
                    //text: formatMessage({
                    //    id: 'videoSensing.setVideoTransparency',
                    //    default: 'set video transparency to [TRANSPARENCY]',
                    //    description: 'Controls transparency of the video preview layer'
                    //}),
                    arguments: {
                        TRANSPARENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                }
            ],
            menus: {
                
                OBJECT_NUMBER: {
                    acceptReporters: true,
                    items: this.OBJECT_NUMBER_MENU
                 },
                VIDEO_STATE: {
                    acceptReporters: true,
                    items: this._buildMenu(this.VIDEO_STATE_INFO)
                },
                ANALYZE_IMAGE_SHOW_STATE: {
                    acceptReporters: true,
                    items: this.ANALYZE_IMAGE_SHOW_STATE_MENU
                 }
            }
        };
    }

    /**
     * Analyze a part of the frame that a target overlaps.
     * @param {Target} target - a target to determine where to analyze
     * @returns {MotionState} the motion state for the given target
     */
    /*_analyzeLocalMotion (target) {
        const drawable = this.runtime.renderer._allDrawables[target.drawableID];
        const state = this._getMotionState(target);
        this.detect.getLocalMotion(drawable, state);
        return state;
    }*/

    //検出したものの数
    getObjectCount () {
        return this.objects.length;
    }

    //検出したもののX位置
    getX (args) { 
        if (this.objects[parseInt(args.OBJECT_NUMBER, 10) - 1]){
            return this.objects[parseInt(args.OBJECT_NUMBER, 10) - 1].x;
        }else{
            return "";
        }
        return "";
    }

    //検出したもののY位置
    getY (args) { 
        if (this.objects[parseInt(args.OBJECT_NUMBER, 10) - 1]){
            return this.objects[parseInt(args.OBJECT_NUMBER, 10) - 1].y;
        }else{
            return "";
        }
        return "";
    }

    //画像解析状況の表示切り替え関数
    analyzeImageShowToggle(args){
        if(args.ANALYZE_IMAGE_SHOW_STATE==1){
            this.globalAnalyzeImageShowFg = 1;
        }else{
            this.globalAnalyzeImageShowFg = 0;
        }
        console.log("this.globalAnalyzeImageShowFg=", this.globalAnalyzeImageShowFg);
         

    }

    setBrightLevel (args) {
        const brightLevel = Cast.toNumber(args.BRIGHT_LEBEL);
        this.globalBrightLevel  = brightLevel;
    }

    setDetectSize (args) {
        const detectSize = Cast.toNumber(args.DETECT_SIZE);
        this.globalDetectSize  = detectSize;
    }
    
    



    /**
     * A scratch reporter block handle that analyzes the last two frames and
     * depending on the arguments, returns the motion or direction for the
     * whole stage or just the target sprite.
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {number} the motion amount or direction of the stage or sprite
     */
    videoOn (args, util) {
        /*this.detect.analyzeFrame();

        let state = this.detect;
        if (args.SUBJECT === SensingSubject.SPRITE) {
            state = this._analyzeLocalMotion(util.target);
        }

        if (args.ATTRIBUTE === SensingAttribute.MOTION) {
            return state.motionAmount;
        }
        return state.motionDirection;*/

    }

    /**
     * A scratch command block handle that configures the video state from
     * passed arguments.
     * @param {object} args - the block arguments
     * @param {VideoState} args.VIDEO_STATE - the video state to set the device to
     */
    videoToggle (args) {
        const state = args.VIDEO_STATE;
        this.globalVideoState = state;
        if (state === VideoState.OFF) {
            this.runtime.ioDevices.video.disableVideo();
        } else {
            this.runtime.ioDevices.video.enableVideo();
            // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
            this.runtime.ioDevices.video.mirror = state === VideoState.ON;
        }
    }

    /**
     * A scratch command block handle that configures the video preview's
     * transparency from passed arguments.
     * @param {object} args - the block arguments
     * @param {number} args.TRANSPARENCY - the transparency to set the video
     *   preview to
     */
    setVideoTransparency (args) {
        const transparency = Cast.toNumber(args.TRANSPARENCY);
        this.globalVideoTransparency = transparency;
        this.runtime.ioDevices.video.setPreviewGhost(transparency);
    }

    setLocale() {
        let locale = formatMessage.setup().locale;
        if (AvailableLocales.includes(locale)) {
          return locale;
        } else {
          return 'en';
        }
    }
}

module.exports = Scratch3LightSensingBlocks;
