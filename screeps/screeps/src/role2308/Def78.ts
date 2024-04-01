import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { wrapFn3, MoveTo3 ,print } from "./Move3.js"
import { Spawn78 } from "./Spawn78";
import { Ship78 } from "./Ship78";

/**
 * 简易防御类

 * */
export class Def78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    seting: any//设置数据 例如哪些房间不搞 哪些可搞 room
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型 
    //------------------以下自动管理
 
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "Def78"
        super.init();
        this.logleaveAuto = 20;//20
        //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind; 
            this.seting = props.seting
     
        }  
        this._init();
         
    } 

    run() {
        //T攻击
        for (let roomname in this.seting["rooms"]) {
            this._attdef(roomname)
            //this._addplan(roomname)
        }
        for (let roomname in this.seting["outoce"]) {
            this._addplan(roomname)
        }
        //doplan 
        let plans = this.memoryclass["plans"]
        for (let roomname in plans) {
            this._doplan(roomname)
        }
    }
 
    CreepRun(creep: Creep) {
        this.AddLog("CreepRun in :", 15, creep.pos);
        this.reflocal(creep)
        let rolekey = creep.memory["rolekey"]
        let plans = this.memoryclass["plans"]
        if (plans[rolekey] && !plans[rolekey]["dousers"][creep.name]) {
        
            let role = plans[rolekey]
   
            if (!role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creep: creep.name
              
                }
             
            }
        }
        let rolekind = creep.memory["rolekind"]

        let roomname = creep.memory["roleroom"]
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test"

        }
        //this.AddLog("Creep   test in debug:"
        //    + creep.memory["local"] + this.classname, 26, global.mine9[creep.memory["local"]]["localCShip78"]);

        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto

        if (creep.spawning) return;
        let room78: RoomData = this.roomdatas.getRoomdata(roomname);
        let targetid = creep.memory["targetid"]
        this.AddLog("  creeprun move to  get room  targetid 333 :" + targetid, 10);
        if (!targetid && room78) {
            if (room78.globalclass.creepsother && Object.keys(room78.globalclass.creepsother).length >= 1) {
                targetid = room78.globalclass.creepsother[0].id
                creep.memory["targetid"] = targetid
                this.AddLog(" check creepsother ：" + targetid, 20, room78.globalclass.creepsother[0])
            }
          
            if (room78.globalclass.invaderCorefind
                && Object.keys(room78.globalclass.invaderCorefind).length > 0) {
                targetid = room78.globalclass.invaderCorefind[0].id;
                creep.memory["targetid"] = targetid
            }
        }

        let target: any = this.getObjectById(targetid)
        this.AddLog("  creeprun move to  get room  targetid :" + targetid, 10, target);


        if (target) {
            creep.memory["targetpos"] = target.pos
            let tmp
            if (creep.pos.isNearTo(target)) {
                tmp = creep.attack(target)
                this.AddLog("  creepatt att   :" + tmp, 10, target);
            } else {
                if (creep.room.name != target.room.name)
                    creep.moveTo( target)
                else {
                    //多个目标打最近的
                    if (room78.globalclass.creepsother && Object.keys(room78.globalclass.creepsother).length >= 1) {
                        let nearmax = 999
                        for (var i = 0; i < Object.keys(room78.globalclass.creepsother).length; i++) {
                            let creepid: any = room78.globalclass.creepsother[0].id
                            let creepnext = this.getObjectById(creepid)
                            let nearnow = creep.pos.getRangeTo(creepnext["pos"])
                            if (nearnow < nearmax) {
                                target = creepnext
                            }

                        }
                    }
                    this.moveMapNotOut(creep)
                    tmp = creep.moveTo(target)
                }

                //   creep.moveTo(target)
                this.AddLog("  creepatt move to   :" + tmp, 10, target);
            }
            return;
        }

        if (!room78) {
            let targetpos = creep.memory["targetpos"]
            let des
            if (targetpos) {
                des = new RoomPosition(targetpos.x, targetpos.y, targetpos.roomName)
            } else {
                des = new RoomPosition(8, 25, roomname)
            }

            //creep.moveTo(des)

            creep.moveTo( des)
            return;
        } else {
            if (targetid && !target) {
                this.AddLog("  creeprun clear rolekey   targetid :" + targetid, 40, target);
                delete creep.memory["targetid"]
                delete creep.memory["rolekey"]
                return
            }
        }
    }
    
 
 

    _doplan(roomname) {
        if (!this.iscanref(roomname)) {
            return;
        }
        let plans = this.memoryclass["plans"]      
        let role = plans[roomname] 
        let dousers = role["dousers"]
        if (dousers && Object.keys(dousers).length >= 1)
            return;
        let rolekey = role["rolekey"]
        let mem = {
            memory: {
                rolekind: this.classname
                , roleroom: roomname
                , rolekey: rolekey //唯一标记 
                , ckind: this.botkind//有可能一种机型不同的任务的
                
            }
        }
        this.AddLog("_runWorknum addplan:", 15, mem);
        //找到一个没有安排的位置 安排生产
        this.spawn78.addplan(rolekey + this.classname, this.createlv, mem, this.addcallback)
    }

    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"]
        let role = Memory["rolelist78"]["Def78"]["plans"][rolekey]
        if (!role) return
        if (!role["dousers"])
            role["dousers"] = {} 
     
        role["dousers"][creepname] = {
            creep: creepname
     
        }
     
    }

    _addplan(roomname) {
        let plans = this.memoryclass["plans"] 
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (!roomdata) return;
        let invaderCorefind;
        if (this.iscanref(roomname)) {
            roomdata.globalclass.creepsother = roomdata.room.find(FIND_HOSTILE_CREEPS)//其它爬
            roomdata.globalclass.invaderCorefind = roomdata.room.find(FIND_STRUCTURES, {
                filter: { structureType: STRUCTURE_INVADER_CORE }
            });
          
        }
      
        if ((roomdata.globalclass.creepsother
            && Object.keys(roomdata.globalclass.creepsother).length > 0)
            || (roomdata.globalclass.invaderCorefind
            && Object.keys(roomdata.globalclass.invaderCorefind).length > 0)       ) {
            if (!plans[roomname]) {
                plans[roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname
                    , kind: "creep" 
                    , dousers: {}
                }
            }
            return
        }
        delete this.memoryclass["plans"][roomname] 
    }

    _attdef(roomname) {
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (!roomdata) return;
        if (this.iscanref(roomname)) {
            roomdata.globalclass.creepsother = roomdata.room.find(FIND_HOSTILE_CREEPS)//其它爬
        }

        this.AddLog("test att :", 10, roomdata.globalclass.creepsother);
        if (roomdata.globalclass.creepsother && Object.keys(roomdata.globalclass.creepsother).length >= 1) {
            let atts = roomdata.globalclass.creepsother;
            let towers = roomdata.globalclass[STRUCTURE_TOWER]
            this.AddLog("test att  towers:", 10, towers);
            if (atts && Object.keys(atts).length >= 1) {
                for (let attid in atts) {
                    for (let towerid in towers) {
                        let tid: any = towerid
                        let towertmp: any = this.getObjectById(tid)
                        towertmp["attack"](atts[attid])

                    }
                    break;
                }
            }
        }
    }

    _init() {

        if (!this.memoryclass["plans"]) this.memoryclass["plans"] = {}

    }



     
  
   
     
  
 


}

 
 
 