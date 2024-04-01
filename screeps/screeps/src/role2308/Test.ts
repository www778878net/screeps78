import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { wrapFn3, MoveTo3 ,print } from "./Move3.js"

/**
 * 

 * */
export class Test extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    //------------------以下自动管理
 
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "Test"
        super.init();
        //this.globalclass = global.mine9[this.classname]//任务挂 
        //console.log(wrapFn3)
        //console.log(MoveTo3)
        //Creep.prototype.moveTo = wrapFn3(MoveTo3, 'moveTo');
        //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas
        } 
 
        this.logleave = 0;  
        //delete Memory["rolelist78"][this.classname]
    } 

 
 
    
 
    run() {
        if (global.tick % 5 == 4) {
            //let test = print();
            //console.log(test)
        }

    }

  
     
  
   
     
  
 


}

 
 
 