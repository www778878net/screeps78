import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";

/**
 * 升级
 * .加个设置 每个房间可以设置Worknum
 * */
export class Up78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    botkind: string//可以自动调配的BOT类型 
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    ship78: Ship78
    warknummax: number//最大升级爬 work数量
    seting:any
    //------------------以下自动管理
    controlls: any//矿数据
    creeps: object//矿爬数据
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "Up78"
        this.logleaveAuto = 40;  
        super.init();
   
         //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas 
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78
            this.warknummax = props.warknummax
            this.seting = props.seting
        } 
        this._init();
    
        
    }  
    
 
    run() {
        this.controlls = this.getMemoryclass()["controlls"] 
        if (!this.controlls) {
            this._init()
        }
        this.creeps = this.roomdatas.creeps[this.classname];
        this.AddLog("run init:" , 15);
        //循环所有的控制器
        for (let controllid in this.controlls) {
            //if (!this.iscanref(controllid)) {
            //    return;
            //}
            //获取这个控制器周围可以站的点及当前有多少WORK了
            this._runGetinfo(controllid)
            //如果没到15个就可以安排
            this._runWorknum(controllid)
        }
        this.AddLog("run over:", 30, this.controlls);
        //this._run();
    }

    /**
     * 如果没到15个就可以安排
     * */
    _runWorknum(controllid) {
       // this.controlls[controllid]["worknum"]
        let controll: any = this.getObjectById(controllid)
        if (!controll) return;
        let locals = this.controlls[controllid]["locals"]
        let worknum = 0;// this.controlls[controllid]["worknum"];
        this.AddLog("test 1_runWorknum:" + worknum, 20, locals);
        for (let key in locals) { 
            let rolekey = key + this.classname
            this.AddLog("test 2_runWorknum:" + key + locals[key]["douser"], 20, Game.creeps[locals[key]["douser"]]);
            if (locals[key]["douser"]) {
                if (!Game.creeps[locals[key]["douser"]]) {
                    delete locals[key]["douser"] 
                    delete locals["worknum"]
                    continue
                }  
                worknum += locals[key]["worknum"]
                this.controlls[controllid]["worknum"] = worknum
                this.AddLog("test 3_runWorknum:" + worknum, 20);
                 continue;
            }
            //else {
            //    if (locals[key]["worknum"]) {
            //        worknum -= locals[key]["worknum"]
            //        this.controlls[controllid]["worknum"] = worknum
            //        delete locals["worknum"]
            //    } 
            //}
              
        }
        this.AddLog("test 5_runWorknum:" + worknum, 20, this.controlls[controllid]);
        if (worknum >= this.warknummax-5) return;
        let createlvtmp = this.createlv;
        if (worknum >= 4) createlvtmp = createlvtmp -40;
        if (worknum >= 9) createlvtmp = createlvtmp - 60;
        if (worknum <= 0) createlvtmp += 20
        let maxworknum = this.warknummax - worknum
        let roomname = this.controlls[controllid]["roomname"]
        //找到一个可以安排的位置
        for (let key in locals) {
            let rolekey = roomname + key + this.classname     
            if (locals[key]["no"]) continue
            let creeptmp = Game.creeps[rolekey]
            if (creeptmp) {
                locals[key]["douser"] = rolekey
                locals[key]["worknum"] = creeptmp.memory["worknum"]
                //this.controlls[controllid]["worknum"] += creeptmp.memory["worknum"]
                continue
            }
          
            //找到一个没有安排的位置 安排生产
            this.spawn78.addplan(rolekey, createlvtmp, {
                memory: {
                    rolekind: this.classname
                    , roleroom: controll.room.name
                    , sourceid: this.controlls[controllid]["sourceid"]
                    , rolekey: rolekey//唯一标记
                    , rolex: locals[key]["x"]
                    , roley: locals[key]["y"]
                    , ckind: this.botkind//有可能一种机型不同的任务的
                    , targetid: controllid
                    , creepname: rolekey 
                    , maxworknum: maxworknum
                }
            },this.addcallback)
            return;
        }
    }

    addcallback(rolekey, creepname, createrole) {
    
        let targetid = createrole["mempar"]["memory"]["targetid"]
        let rolex = createrole["mempar"]["memory"]["rolex"]
        let roley = createrole["mempar"]["memory"]["roley"]
        let role = Memory["rolelist78"]["Up78"]["controlls"][targetid]
        if (!role) return
        role["locals"][rolex + "_" + roley]["douser"] = creepname
    }

    /**
     * 获取这个控制器周围可以站的点及当前有多少WORK了
     * */
    _runGetinfo(controllid) {
       
        //找可以站的地
        let locals = this.controlls[controllid]["locals"]
        if (!locals|| Object.keys(locals).length >= 1) return;

        //必须在仓库边上 且在控制器3格内
        let controll:any = this.getObjectById(controllid)
        let roomname = this.controlls[controllid]["roomname"]
        let roomdata = this.roomdatas.getRoomdata(roomname)
        let sourceid:any = roomdata.linkupid || roomdata.storeupid
        this.AddLog("_runGetinfo :" + sourceid, 15);
        let souce: any = this.getObjectById(sourceid)
        if (!souce) {
            this.AddLog("_runGetinfo err souce empty:" + sourceid, 20);
            return;
        }
        this.controlls[controllid]["sourceid"] = sourceid
 
        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {
                let tmpx = souce.pos.x + x;
                let tmpy = souce.pos.y + y
                let tmppos = new RoomPosition(tmpx, tmpy, roomname)
                if (!this._getPosCanMove(tmppos, false)) {
                    continue;
                }
                if (!controll.pos.inRangeTo(tmpx, tmpy, 2)) 
                    continue;
                let key = tmpx + "_" + tmpy
                if(!locals[key])
                    locals[key] = {
                        x:tmpx,y:tmpy
                    }
          
                
            }
        }
      
    }

   

    _init() {
        //把这个任务的爬和所有的矿拉过来
        
        if (!this.memoryclass["controlls"]) this.memoryclass["controlls"] = {}
        this.controlls = this.getMemoryclass()["controlls"] 
        for (let roomname in this.seting.rooms) { 
            let roomdata: RoomData = this.roomdatas.getRoomdata(roomname)
            if (!roomdata || !roomdata.spawnname) continue;  
            let id = roomdata.room.controller.id
            if (!this.controlls[id])
                this.controlls[id] = {
                    id: id, roomname: roomname
                    , worknum: 0//几个WORK
                    , locals: {}//几个可站地
               
                }

        }

    }


    CreepRun(creep: Creep) {
        this.AddLog("  creeprun init :", 10);
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
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
        let isno = creep.memory["isno"]
      

        let controllid = creep.memory["targetid"]
        if (!this.controlls[controllid]) this.controlls[controllid] = {}
        let locals = this.controlls[controllid]["locals"]
        let x = creep.memory["rolex"]
        let y = creep.memory["roley"]
        //修复DOUSER应该不用了 creepname=rolekey在role就修复了
        if (locals && locals[x + "_" + y] && !locals[x + "_" + y]["douser"]) { 
            locals[x + "_" + y]["douser"] = creep.name;
            locals[x + "_" + y]["worknum"] = creep.memory["worknum"];
        }
        let contoll = this.getObjectById(controllid)
   
        //this.AddLog("test   isno:" + isno, 50, locals );
        if (isno && locals[x + "_" + y]) {
            locals[x+"_"+y]["no"]=1
        }
        let des = new RoomPosition(x, y, roomname)
        let rolestep = creep.memory["rolestep"]
        if (!rolestep) {
            if (!creep.pos.isEqualTo(des)) {
                rolestep = "move"
            } else {
                rolestep = "working"
            }
        }
        if (rolestep == "move") {
            if (!creep.pos.isEqualTo(des)) {
                let tmp = creep.moveTo(des)
            } else {
                rolestep = "working"
            }
            return
        }
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (rolestep == "working") {
            let sourceid = creep.memory["sourceid"];
            if (creep.store.getUsedCapacity() == 0) {
                //if (!sourceid && room78.linkup) {
                //    sourceid = room78.linkup
                //    creep.memory["sourceid"] = sourceid
                //}
                if (!sourceid) {
                    let containers = roomdata.globalclass["container"]
                    for (let tmpid in containers) {
                        let con: any = containers[tmpid]
                        let conid: any = con["id"]
                        if (creep.pos.isNearTo(con)) {
                            sourceid = conid
                            creep.memory["sourceid"] = sourceid;
                            break;
                        }
                    }
                }

                if (!sourceid) {
                    //没有靠近的资源池
                    this.AddLog("build sourceid not fould  :" + rolekey + " ", 50);
                    return;
                }
                let source: any = this.getObjectById(sourceid)

                if (source && source["store"].getUsedCapacity(RESOURCE_ENERGY) <= 100) {
                    this.AddLog("build source  :" + sourceid + source["store"].getUsedCapacity(RESOURCE_ENERGY), 15, source);
                    if (source["store"].getFreeCapacity() >= 1000) {//仓库才大于1000
                        //this.rcenter.cautoship2.addplan(source.id, "t", "storeup", source["store"].getFreeCapacity(), "energy")
                        //this.rcenter.roleship.addplan(source.id, "t"
                        //    , "storeup", source["store"].getFreeCapacity(), "energy")
                        this.ship78.addplan(sourceid, "t", "storeup", source.store.getFreeCapacity(RESOURCE_ENERGY), "energy")
                    } 
                     

                    return;
                }
                let tmp = creep.withdraw(source, RESOURCE_ENERGY)


                return;
            }


            let source: any = this.getObjectById(sourceid)
            if (source && source["store"].getFreeCapacity() >= 800) {
                //this.rcenter.cautoship2.addplan(source.id, "t", "storeup", source["store"].getFreeCapacity(), "energy")
                //this.rcenter.roleship.addplan(source.id, "t", "storeup", source["store"].getFreeCapacity(), "energy")

            }
            //修仓库
            if (source && source["hits"] < source["hitsMax"] * 0.9) {
                creep.repair(source)
                return
            }

            //找一个最近的工地
            if (!creep.memory["buildover"]) {
                let buildtarget = null
                let length = roomdata.globalclass.constructionsites.length
                let buildid = creep.memory["buildid"] 
                if (buildid)
                    buildtarget = this.getObjectById(buildid)
                if (!buildtarget) {
                    delete creep.memory["buildid"] 
                    for (var i = 0; i < length; i++) {
                        // this.AddLog("collectstatic  check :" + state + " " + creep.pos.isNearTo(this.constructionsites[i].pos), 0);
                        if (creep.pos.inRangeTo(roomdata.globalclass.constructionsites[i].pos, 3)) {
                            buildtarget = roomdata.globalclass.constructionsites[i];
                            creep.memory["buildid"] = buildtarget.id;
                            this.AddLog("build8 build    role_target pos change:", 20, roomdata.globalclass.constructionsites[i].pos);
                            break;
                        }
                    }
                }  
           

                if (buildtarget) {
                    let tmp = creep.build(buildtarget);
                    //this.AddLog("rcollectstatic build    role_target:" + tmp + " ", 15);
                    return;
                }
                else {
                    creep.memory["buildover"] = true;

                }
            }

            let contral = this.getObjectById(roomdata.room.controller.id);
            this.AddLog("CreepBuild build    role_target controller:", 0);
            if (creep.pos.inRangeTo(contral, 3)) {
                let tmp = creep.upgradeController(contral);
                this.AddLog("CreepBuild        controller upgradeController:"
                    + tmp + " " + contral.progress, 20);
            }
            this.AddLog("collectbuild    25:"
                , 15, creep.store);
            return;
        }
    }
    

    
   
  
 


}

 
 
 