import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";



/**
 * 
 * */
export class Watch78 extends Basic78 {

    //本模块需要的所有前置
    props: any
    roomdatas: RoomData78//房间数据
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型


    seting: object//设置数据

    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();

        this.classname = "Watch78"
        this.logleaveAuto = 30;//20
        super.init();

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



    _init() {
        if (!this.memoryclass["plans"]) this.memoryclass["plans"] = {}
    }

    Run() {

   
       
  
        //if (!this.iscanref(this.classname)) return;
     
        this._autoPlan()//计算  一个房间一个计划      
        
        this._doPlan();//调配或安排生产
    }



    CreepRun(creep: Creep) {
        this.reflocal(creep)
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"]
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
        let role = plans[rolekey]
        if (role) {
            role["douser"] = creep.name
        }
        else {
            delete creep.memory["rolekey"]
        }
        let roomname = creep.memory["roleroom"]
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test"
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
       
        if (creep.spawning) return; 
        if (!roomname) roomname=creep.room.name
        let roomdata = this.roomdatas.getRoomdata(roomname)
        this.AddLog("  creeprun init :" + roomname, 10,roomdata);
        if (roomdata) { 
            this.moveMapNotOut(creep)
            
            //如果有2个以上的爬了可以删任务了
            if (this.iscanref(roomname)) {
                //if (roomdata.room && roomdata.room.controller) {
                //    //改签名
                //    //"id":"5bbcab1d9099fc012e632deb","room":{"name":"W34N12","energyAvailable":56,"energyCapacityAvailable":1300,"visual":{"roomName":"W34N12"}},"pos":{"x":19,"y":42,"roomName":"W34N12"},"ticksToDowngrade":40000,"level":4,"progress":119690,"progressTotal":405000,"safeModeAvailable":3,"sign":{"username":"Imu","text":"✌🏽✌🏽","time":34927627,"datetime":"2022-01-12T00:46:25.085Z"},"isPowerEnabled":false,"owner":{"username":"www778878net"},"my":true,"hits":0,"hitsMax":0,"structureType":"controller"}
                //}
                let creeps = roomdata.room.find(FIND_MY_CREEPS)
                //this.AddLog("  creeprun test :" + roomname + Object.keys(creeps).length, 10, creeps);
                if (Object.keys(creeps).length >= 3) {
                    delete plans[rolekey]
                    delete creep.memory["rolekey"]
                    //delete creep.memory["roleroom"]
                    creep.suicide();
                }
            }
            return; 
        }
        if (!rolekey) return;
        let targetpos = creep.memory["targetpos"]
        this.AddLog("Creep   test in debug:" + roomname + targetpos, 20, targetpos);
   
        let des
        if (targetpos) {
            des = new RoomPosition(targetpos.x, targetpos.y, targetpos.roomName)
        } else {
            des = new RoomPosition(8, 25, roomname)
        }
   
        //creep.moveTo(des)

        creep.moveTo(des)

         
        return;

    }

    /**
     * 没有douser的调配 没有调配的就生产
     * */
    _doPlan() {
        let plans = this.getMemoryclass()["plans"]
        for (let roomname in plans) {
            if (!this.iscanref(roomname)) {
                continue;
            }
            this.addlog("_doPlan", " check   :"+roomname
                , 15, this.seting["catt"])
            if (!this.seting["rooms"][roomname] && !this.seting["outoce"][roomname]
                && !this.seting["catt"][roomname]            ) {
                delete plans[roomname]
                continue;
            }
            let role = plans[roomname]
            let douser = role["douser"]
            if (douser) {
                this.addlog("_doPlan", "dousr check   :" + roomname + douser
                    , 15, null, roomname, douser)
                let creepdouser = Game.creeps[douser]
                if (creepdouser) {
                    //if (creepdouser.memory["rolekey"] == roomname) {
                    //    continue;
                    //}
                    this.addlog("_doPlan", "dousr check  set rolekey  :" + roomname + douser
                        , 15, null, roomname, douser)
                    creepdouser.memory["rolekey"] = roomname
                    continue;
                }
                
                delete role["douser"]
                douser = null;
            }
        
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreep(roomname, role)
            let nexts = this.getNextRooms(roomname)
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreep(nexts[i], role)
                    if (findcreep) { 
                        break;
                    }
                }
            }
            if (!findcreep) {
                //再隔壁的隔壁  
                for (var i = 0; i < nexts.length; i++) {
                    let nexts2 = this.getNextRooms(nexts[i])
                    for (var j = 0; j < nexts2.length; j++) {
                        findcreep = this._getcreep(nexts2[j], role)
                        if (findcreep) { 
                            break;
                        }
                    }
                }
            }
            let rolekey = role["rolekey"]
            if (findcreep) {
                role["douser"] = findcreep
                let creep = Game.creeps[findcreep]
                creep.memory["rolekey"] = rolekey
                creep.memory["roleroom"] = role["roleroom"]
                continue;
            }
            //生产
            //没找到 请求新建  
            this.spawn78.addplan(rolekey+this.classname   , this.createlv, {
                memory: {
                    rolekind: this.classname
                    , roleroom: roomname
                    , rolekey: rolekey//唯一标记
                    , ckind: this.botkind//有可能一种机型不同的任务的 
                }
            }, this.addcallback)
            this.AddLog("  addplan  check over not find reqlistadd:" + roomname
                , 10, role)
        }
    }

    addcallback(rolekeyspawn, creepname, createrole) { 
        let rolekey = createrole["mempar"]["memory"]["rolekey"]
        let role = Memory["rolelist78"]["Watch78"]["plans"][rolekey]
        //console.log("watch addcallback "+rolekey + JSON.stringify(role))
        if (!role) return 
        role["douser"] = creepname  
    }

    /**
    * 直接按本地位置来找
    * @param findroom
    */
    _getcreep(lockroom, role) {
        let ckind = this.botkind 

        let roomname = role["roomname"]
        let findcreep
        let roomdata = this.roomdatas.getRoomdata(lockroom)
        if (!roomdata) return;
        let creeps = roomdata.globalclass["local"] [ckind] 
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps)
        if (!creeps) return ""
        for (let cname in creeps) {
            let creep: Creep = Game.creeps[cname]
            if (!creep) {
                delete creeps[cname]
                continue
            }
            if (!creep.memory["rolekey"])
                return cname
        }

    }

    /**
     * 这里只管添加计划
     * */
    _autoPlan() { 
        this.AddLog(" _autoPlan ：", 20, this.seting["outoce"])
        for (let roomname in this.seting["rooms"]) {
            this._autoPlando(roomname)
        }
        for (let roomname in this.seting["outoce"]) {
            this._autoPlando(roomname)
        }
        this.addlog("_autoPlan",  " check catt :" 
            , 15, this.seting["catt"])
        for (let roomname in this.seting["catt"]) {
            this._autoPlando(roomname)
        }
  
        this.AddLog(" _autoPlan ：", 15, this.seting["outoce"])
    }

    _autoPlando(roomname) {
    
        //if (!this.iscanref(roomname)) {
        //    return;
        //}
        let plans = this.getMemoryclass()["plans"]
        let roomdata = this.roomdatas.getRoomdata(roomname)
        this.AddLog(" _autoPlan1 ：" + roomname, 20, roomdata)
        if (roomdata) {
            if (plans[roomname])
                delete plans[roomname];
            return;
        }
    
        if (!plans[roomname]) {
            plans[roomname] = {
                "rolekey": roomname ,
                roleroom: roomname
             
            };
        }
        this.addlog("_autoPlando", " check  roomname2 :" + roomname
            , 15, plans)
    }

}
   
     
  
 




 
 
 