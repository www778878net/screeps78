import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";

/**
 * 采矿功能模块
 * .采矿的最好坐仓库上
 * */
export class Oce78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    seting: any//设置数据 例如哪些房间不搞 哪些可搞 room
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型
    ship78: Ship78
    //------------------以下自动管理
    //sources: any//矿数据
    //creeps:any//矿爬数据
    //plans
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "Oce78"
        super.init();
        this.logleaveAuto = 30//25;  
         //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas
            this.seting = props.seting
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78
        } 
        this._init();
     
       
    }  
    

    run() {
        
        this.AddLog("run init:", 15);
        this._autoPlan()//计算  一个房间一个计划      
        this.AddLog("plans:", 15);
        this._doplan();//是否安排生产

        //循环所有的控制器
        //for (let sourceid in this.sources) {
        //    //获取这个控制器周围可以站的点及当前有多少WORK了
        //    this._runGetinfo(sourceid)
        //    if (!this.sources[sourceid]) continue;
        //    //如果没到15个就可以安排
        //    this._runWorknum(sourceid)
        //}
        //this.AddLog("run over:", 25, this.sources);
        //this._run();
    }

    addcallback(rolekey, creepname,  createrole) {
     
        let role = Memory["rolelist78"]["Oce78"]["plans"][rolekey]
        if (!role) return
        if (!role["dousers"])
            role["dousers"] = {}
        delete role["douser"]

        let creep=Game.creeps[creepname]
        let worknum = creep.memory["worknum"]  
        role["worknum"]+=worknum
        role["dousers"][creepname] = {
            creep: creep.name
            , worknum: worknum
        }
    }

    /**
     * false 有了 清除新建
     * */
    _doplan_going(rolekey): boolean {
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"]
        let role = plans[rolekey]
        if(!role)return false
        let worknum = role["worknum"]
        let dousers = role["dousers"]
        let roomname = role["roleroom"]
        if (!this.seting["outoce"][roomname]
            && !this.seting["rooms"][roomname]
            && !this.seting["catt"][roomname]        ) {
            delete plans[rolekey]; 
            return false;//有了还搞啥
        }
        if (!Game.rooms[roomname]) return false;//有了还搞啥
        let worknumcheck = 0
        for (let creepname in dousers) {
            if (!Game.creeps[creepname]) {
                worknum -= role["dousers"][creepname]["worknum"]
                delete role["dousers"][creepname]
                role["worknum"] = worknum
                continue
            }
            else {
                worknumcheck += role["dousers"][creepname]["worknum"]
            }
        }
        role["worknum"] = worknumcheck
        if (worknum >= 6)
            return false;//有了还搞啥
        let createlvtmp = this.createlv;
        if (worknum >= 2) createlvtmp = createlvtmp - 50;
        if (this.seting["outoce"][roomname]) createlvtmp = createlvtmp - 20;
       
        if (!creeps || Object.keys(creeps).length <= 1)
            createlvtmp += 100

       
        let mem = {
            memory: {
                rolekind: this.classname
                , roleroom: roomname
                , rolekey: rolekey //唯一标记 
                , ckind: this.botkind//有可能一种机型不同的任务的
                , targetid: role["targetid"]
            }
        }
        this.AddLog("_runWorknum addplan:", 15, mem);
        //找到一个没有安排的位置 安排生产//
        this.spawn78.addplan(rolekey, createlvtmp, mem, this.addcallback
        )
        return true;
    }

    _doplan() {
        let plans = this.getMemoryclass()["plans"]
      
        for (let rolekey in plans) {
            if (!this.iscanref(rolekey)) {
                continue;
            }
            
            let add = this._doplan_going(rolekey)
            if (!add) { 
                this.spawn78.delplan(rolekey)
            } 
          
        }
    }

 
   

    /**
    * 这里只管添加计划
    * */
    _autoPlan() {
       
        for (let roomname in this.seting["rooms"]) {
            this._autoPlando(roomname)           
        }
        for (let roomname in this.seting["outoce"]) {
            this._autoPlando(roomname)
        }
    }

    _autoPlando(roomname) {
        //if (!this.iscanref(roomname)) {
        //    return;
        //}
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (!roomdata || !roomdata.room)
            return;
        if (!this.getMemoryclass()["plans"]) this.getMemoryclass()["plans"] = {}
        let plans = this.getMemoryclass()["plans"]
        this.addlog("_autoPlando", " _autoPlan1 ：" + roomname, 10, roomdata.sources, roomname)
  
        for (var i = 0; i < roomdata.sources.length; i++) {
            let rolekey = roomdata.sources[i].id + this.classname
            if (!plans[rolekey]) {
                plans[rolekey ] = {
                    "rolekey": rolekey,
                    roleroom: roomname
                    , targetid: roomdata.sources[i].id
                    , worknum: 0
                };
            }else
                plans[rolekey]["targetid"]=roomdata.sources[i].id
            if (!plans[rolekey]["dousers"]) plans[rolekey]["dousers"] = {}

        } 
    }

   

 
 
   

    CreepRun(creep: Creep) {
        this.AddLog("  creeprun init :", 10);
        let plans = this.memoryclass["plans"]
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
        let roomname = creep.memory["roleroom"]
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test"
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        this.AddLog("Creep   test  :" + rolekey, 10, plans[rolekey]);
        if (plans[rolekey] && creep.memory["targetid"] != plans[rolekey]["targetid"])
            creep.memory["targetid"] = plans[rolekey]["targetid"]
        let targetid = creep.memory["targetid"]
        
    
        
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
        if (plans[rolekey] &&!plans[rolekey]["dousers"][creep.name]) {
            let worknum = creep.memory["worknum"]
            let role = plans[rolekey]
            let roleworknum = role["worknum"]
            if (!role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creep: creep.name
                    , worknum: worknum
                }
                role["worknum"] = roleworknum + worknum
            }
        }
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (!roomdata || !roomdata.room) {
            creep.moveTo(new RoomPosition(10, 10, roomname));
            return;
        }
        //if (roomdata && roomdata.globalclass.creepsother && Object.keys(roomdata.globalclass.creepsother).length >= 1) {
        //    return
        //}
        
  
        this.AddLog("  creeprun targetid :" + targetid, 10);

        //如果附近有资源池 要站在池边
        let target: any = this.getObjectById(targetid)
        if (!target) return;
      
        //this.memoryclass[targetid] = creep.name

        if (creep.spawning) return;
        //this.refcreep(creep, 30)
    
        this.AddLog("  CreepRun roomdata  :" + roomname, 10, roomdata);
        //let x = creep.memory["rolex"]
        //let y = creep.memory["roley"]
        //let des = new RoomPosition(x, y, roomname)
        let rolestep = creep.memory["rolestep"]
        if (!rolestep) {
            if (!creep.pos.isNearTo(target)) {
                rolestep = "move"
            } else {
                rolestep = "working"
            }
        }
        if (rolestep == "move") {
            if (!creep.pos.isNearTo(target)) {
                let tmp = creep.moveTo(target)
            } else {
                rolestep = "working"
            }
            return
        }

        if (creep.pos.isNearTo(target)) {
            let tmp = creep.harvest(target)
            if (tmp == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            //if (source) {
            //if (kind == "ext") {
            //    if (source.store.getUsedCapacity() >= 100) {
            //        this.rcenter.roleship.addplan(source.id, "s"
            //            , "sourceext", source.store.getUsedCapacity(), kind, 0, 0, this._getstorage(roomname).id)
            //    }
            //} else {
            //    if (source.store.getUsedCapacity() >= 1000) {
            //        this.rcenter.roleship.addplan(source.id, "s"
            //            , "sourceoce", source.store.getUsedCapacity(), "energy")
            //    }
            //}  
            // }
            return
        }


    }

  

    _init() {
        //把这个任务的爬和所有的矿拉过来
        if (!this.memoryclass["plans"]) this.memoryclass["plans"] = {}

  
  
       
        
    }
     
  
   
     
  
 


}

 
 
 