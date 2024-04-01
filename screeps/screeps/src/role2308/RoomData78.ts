import { extend, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
 

/**
 * 
 * 所有房间数据 基础模块 输出：就是缓存这个房间的数据
 * */
export class RoomData78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any
    //------------------以下自动管理 
    creeps: object//爬数据
   
    //----------------------------
    constructor(props) {
        super( ); 
        this.classname = "roomdata"  
        super.init();
        this._init();
        //this.globalclass = global.mine9[this.classname]//任务挂 
        this.logleaveAuto = 40;  
        delete Memory["rolelist78"][this.classname]
    }

    run() {
        //10回合刷一下CREEP
        this._runcreep();
    }

    _runcreep() {
        if (!this.iscanref(this.classname))
            return;
        this.creeps = this.globalclass["creeps"] 
        //必须全部删掉重新整 只删一遍
        let refinit = {}
     
        //按类别来规整
        for (let creepname in Game.creeps) {
            let creep = Game.creeps[creepname]
            let rolekind = creep.memory["rolekind"];
            let ckind = creep.memory["ckind"];
            let roomname = creep.memory["local"]
            if (!global.mine9[roomname])
                global.mine9[roomname] = {}        
            if (!refinit[roomname]) {
                delete global.mine9[roomname]["local"] 
                refinit[roomname]=true
            }
            if (!global.mine9[roomname]["local"]) global.mine9[roomname]["local"] = {}
            if (!global.mine9[roomname]["local"] [ ckind])
                global.mine9[roomname]["local"][ckind] = {}
            global.mine9[roomname]["local"][ckind][creep.name] = {
                creepname: creep.name, id: creep.id
            }
            if (!refinit[rolekind]) {
                this.creeps[rolekind] = {}
                refinit[rolekind] = true
            }
            if (!refinit[ckind]) {
                this.creeps[ckind] = {}
                refinit[ckind] = true
            }
            if (!this.creeps[rolekind])
                this.creeps[rolekind] = {}
            if (!this.creeps[ckind])
                this.creeps[ckind] = {}
            this.creeps[rolekind][creepname] = { name: creepname, id: creep.id }
            this.creeps[ckind][creepname] = { name: creepname, id: creep.id }
        }


        //清理死掉的机器人
        //这里可以发墓碑请求
        for (var tmp in Memory.creeps) {
            if (!Game.creeps[tmp])
                delete Memory.creeps[tmp];
        }
    }

    /**
     * 获取房间数据
     * @param roomname
     */
    getRoomdata(roomname: string): RoomData {
        if (!roomname) return null;
        //分TICK查询不同房间的数据
        if (!Game.rooms[roomname]) {
            let roomdata = new RoomData({ roomname: roomname })
            this.AddLog("test getRoomdata:" + roomname, 20);
            return null;
        }
        this.AddLog("getRoomdata:" + (!this.globalclass[roomname]) + this.iscanref(roomname), 28);
        if (!this.globalclass[roomname] || this.iscanref(roomname)) {
            if (this.globalclass[roomname]
                && this.globalclass[roomname]["reftick"] == global.tick
                  )
                return this.globalclass[roomname]
            let roomdata = new RoomData({ roomname: roomname })
            if (roomdata.room) {
                this.globalclass[roomname] = roomdata

                this.globalclass[roomname]["reftick"] = global.tick
            }
        }
        return this.globalclass[roomname];
    }

  
    _init() {
      
        if (this.creeps) return;
   
       
        if (!this.globalclass["creeps"]) this.globalclass["creeps"] = {}
        this.creeps = this.globalclass["creeps"] 
       
    }
  
     
  
   
     
  
 


}

 
 
 