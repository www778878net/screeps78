 import { Dictionary, extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { wrapFn3, MoveTo3, print } from "./Move3.js"
import { Spawn78 } from "./Spawn78";

/**
 * 运输模块 这里不放功能 把功能分解方便调试
 * 分解为:添加 分配 替换 生产
 * 
 * */
export class Ship78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    shipstore: number//一个爬 2趟的容量 先写死 后面就可以自动调了决定要安排几个爬
    botkind: string//可以自动调配的BOT类型
   
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    //------------------以下自动管理
    //creeps: any //不知道什么原因 init里面初始化会丢 但是用还是要这样用
 
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "Ship78"
        //this.logleaveAuto = 0;  
        this.logleaveAuto = 28//27 30;  
        super.init();
      
        //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas
            this.spawn78 = props.spawn78;
            this.shipstore = this.spawn78.shipstore
        
            this.createlv = props.createlv;
            this.botkind = props.botkind;
           
        } 
        this._init();
        this.reftotal = 10;
        
    } 
    
 
    run() {  
    
        this._run();
    }

    _run() {
         
        for (let roomname in Game.rooms) {
            let roomdata: RoomData = this.roomdatas.getRoomdata(roomname)
            this.AddLog("_run   " + this.logleave + " " + roomname, 26, roomdata)
            if (!roomdata) continue;    
            //this.logleave = this.logleaveAuto
     
            if (this.iscanref(roomname)) {
                this._addplanAuto(roomdata)//比如外矿这些没法事件的 隔一阵检查下
            }
            //清理

             //try {
            //this._doplan(room78)
            //} catch (e) {
            //    this.AddLog("_doplan err try :" + roomname, 90, e)
            //}
        }
    }

    _addplanAuto(roomdata: RoomData) {
        //前面判断了roomname必然存在
        //补spawn 
        let roomname = roomdata.room.name;
        if (!this.memoryclass[roomname]) this.memoryclass[roomname] = {}
        //清理
        for (let rolename in this.memoryclass[roomname]["t"]) {
            let role = this.memoryclass[roomname]["t"][rolename]            
            let roletargetid = role["roletargetid"]
            let target = this.getObjectById(roletargetid)
            if (!target)
                delete this.memoryclass[roomname]["t"][rolename]
        }
        for (let rolename in this.memoryclass[roomname]["s"]) {
            let role = this.memoryclass[roomname]["s"][rolename]
            let roletargetid = role["roletargetid"]
            let target = this.getObjectById(roletargetid)
            if (!target)
                delete this.memoryclass[roomname]["s"][rolename]
            //if (roomname == "W35N12") {
            //    this.addlog("_addplanAuto", "clear check s:" + roletargetid
            //        , 10, target ,   roomname)
            //}
        }
        if (roomdata.room
            && roomdata.room.energyAvailable > 0
            && roomdata.room.energyAvailable < roomdata.room.energyCapacityAvailable) {
            this.AddLog("autoplan  spawn:" + roomname, 10, roomdata);
            //spawn可能多个
            this.addplan(Game.spawns[roomdata.spawnname].id, "t"
                , "spawn", roomdata.room.energyCapacityAvailable - roomdata.room.energyAvailable
                , "energy", 0, 0, "", roomname)

        }

        //仓库这里应该要识别 不要把UP弄进来 或者UP那里去除也行
        let structs;// 
        //仓库不用了 直接用预警的
        //structs = roomdata.getstructByType(STRUCTURE_CONTAINER)
        //for (let index in structs) {
        //    let struct = structs[index]
        //    let id = struct.id;
        //    this.AddLog("_addplan check  full:" + roomname
        //        + " " + struct["store"].getFreeCapacity(), 10, struct.pos)
        //    if (this.memoryclass[roomname]["t"]["id"]) continue;

        //    if (struct["store"].getUsedCapacity() >= 500) {
        //        this.ship78.addplan(id, "s", "sourcenormal", struct["store"].getUsedCapacity(), "energy")
        //    }
        //}
        structs = roomdata.getstructByType(STRUCTURE_TOWER)
        this.AddLog("autoplan  tower:", 10, structs);
        for (let ckey in structs) {
            let stuid: any = ckey;
            let tower: any = this.getObjectById(stuid)// structs[ckey]
        
            //let tower: StructureTower = structs[ckey]
            if (tower && tower.store.getFreeCapacity(RESOURCE_ENERGY) == 0) continue;
            //this.AddLog("autoplan  tower add power:", 40, structs);
            this.addplan(stuid, "t", "tower", tower.store.getFreeCapacity(RESOURCE_ENERGY), "energy")
        }

        if (roomdata.linkstorageid) {
            let tmpstr: any = roomdata.linkstorageid
            let lickst: any = this.getObjectById(tmpstr)
            this.AddLog("_addplan check  linkstorage:" + roomname
                + " " + lickst.store.getFreeCapacity(RESOURCE_ENERGY), 10)
            if (lickst.store.getFreeCapacity(RESOURCE_ENERGY) > 100)
                this.addplan(roomdata.linkstorageid, "t", "linkstorage"
                    , 800, "energy")
        }


        //捡扔的资源 还有其它几种资源也要加上 要测试
        if (roomdata && roomdata.room) {
            
            structs = roomdata.room.find(FIND_DROPPED_RESOURCES)
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i]
                this.AddLog("pickup    FIND_DROPPED_RESOURCES:" + this.logleave, 0, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["energy"];
                if (energy <= 40) continue;
                //后面改成没有罐子才continue
                let resourceType = structtmp["resourceType"];
                if (resourceType != "energy") {
                    delete this.getMemoryclass()[roomname]["s"][structtmp.id+this.classname]
                    continue;//&& !roomdata.room.storage
                }
                   
                let id = structtmp.id
                this.addplan(id, "s", "resoucebig", energy, "energy")

                this.AddLog("pickup find  check in roomrole:" + this.logleave, 0, structtmp);
            }

            structs = roomdata.room.find(FIND_RUINS)
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i]
                this.AddLog("pickup find :" + this.logleave, 0, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["store"]["energy"];
                if (energy <= 40) continue;
                let id = structtmp.id
                this.addplan(id, "s", "resoucebig", energy, "energy")

                this.AddLog("pickup find  check roomrole:" + this.logleave, 20, structtmp);
            }
        }
    }


    _init() {
        for (let roomname in Game.rooms) {
            if (!this.memoryclass[roomname]) this.memoryclass[roomname] = {}
            if (!this.memoryclass[roomname]["s"]) this.memoryclass[roomname]["s"] = {}
            if (!this.memoryclass[roomname]["t"]) this.memoryclass[roomname]["t"] = {}
            this.AddLog("init:" + roomname, 0, this.memoryclass[roomname]);
        }
        
    }

    /**
     * .莫名其妙就清了
     * .clear时打一下理由和日志 把mem打出来
     * .得把pos存进mem先
     * */
    CreepRun(creep: Creep) {
        this.reflocal(creep)
        //如果我的仓库容量小于房间的一半自杀     
        if (creep.store.getCapacity() < creep.room.energyAvailable / 3) {
            let creeps = this.roomdatas.creeps[this.classname];
            if (Object.keys(creeps).length > Object.keys(Game.rooms).length ) { 
                this.AddLog("Creep suicide   test :" + creep.room.name  , 20
                    , creep.pos);
                delete this.roomdatas.creeps[this.classname][creep.name]
                creep.suicide()
                
                return;
            }
        }
        let ckind = creep.memory["ckind"]
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto  
        let targetid = creep.memory["targetid"];
        let sourceid = creep.memory["sourceid"];
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
        let roomname = creep.memory["roleroom"] 
        let srolekey = creep.memory["srolekey"] 
        let trolekey = creep.memory["trolekey"] 
        this.addlog("shipcreep", "Creep run   testin :" + creep.name + ckind
            , 10, creep.memory, creep.name,  targetid, sourceid, srolekey, trolekey)
        this.addlog("shipcreep", "Creep run   testinpos :" + creep.name  
            , 10, creep.pos, creep.name, targetid, sourceid, srolekey, trolekey)
 


   

       
        if (creep.spawning) return;
        let enkindt = creep.memory["enkindt"]
        let enkinds = creep.memory["enkinds"] 
        //if (this.logleave == 10)
            //this.AddLog("Creep   test in debug:" + this.logleave, 10, creep.pos);
        //if (enkindt == "spawn")
        //    this.logleave = 10
        //else
        //    this.logleave = this.logleaveAuto
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name)
        let storage = roomdata.getstorage()
        //没任务了还能源
        if (!rolekey) {
            //还能源
            if (creep.store.getUsedCapacity() > 0) {
                //直接找到罐子
                this.addlog("shipcreep", " backpower", 20, creep, creep.name, rolekey, targetid, sourceid)
                creep.memory["rolekey"] = "backpower"                
                creep.memory["lv"] = -1
                creep.memory["lvt"] = -1
                creep.memory["lvs"] = -1
                creep.memory["enkindt"]=""
                creep.memory["rolestep"] = "target"
                this.AddLog("Creep   backpower find storage:"
                    + this.logleave + rolekey + " " + creep.id, 10, storage);
                if (storage) {
                    this.creepClearMemory(creep)
                    creep.memory["sourceid"] = storage.id
                    creep.memory["targetid"] = storage.id
                }
                else {
                    //没有随便找个空仓库
                    this.__creeprunGetTargetid(creep)
                   
                }
               

                return
            }
            this.addlog("shipcreep", " rolekey empty", 20, creep, creep.name, rolekey, targetid, sourceid)
            this.creepClearMemory(creep)
            

            this.AddLog("Creep creeprun2 rolekey empty:" + this.logleave + rolekey + " " + creep.id, 10, creep.pos);
            return;
        }
        delete creep.memory["isnotrold"];
        let rolestep = creep.memory["rolestep"]
        if (rolekey == "backpower") {
            if (creep.store.getUsedCapacity() == 0) {
                delete creep.memory["rolekey"]
                rolekey = ""
                return;
            }
            else {
                rolestep = "target"

            }
        }
    
        let lvs = creep.memory["lvs"]
        let lvt = creep.memory["lvt"]
        this.__creeprundouser(creep)

        //如果目标或源为空的处理
        let target: any     
        if (targetid)
            target = this.getObjectById(targetid)
        if (!target) {
             if (enkindt != "spawn") {
                if (storage) {
                    target = storage
                    creep.memory["targetid"] = storage.id
                }
                else {
                    //没有随便找个空仓库
                    if (roomdata.storeupid) {
                        creep.memory["targetid"] = roomdata.storeupid
                        target = this.getObjectById(creep.memory["targetid"])
                    }
                       
                }
            } 
            if (!target && lvt > 0) {
                if (enkindt == "spawn") {
                    targetid = this._getTragetidSpawn(creep)
                    if (targetid == 999) return;//这个回合补了
                    target = this.getObjectById(targetid)
                    this.addlog("shipcreep", " rolestep target spawn change  " + targetid
                        , 20, target, creep.name, rolekey, targetid, sourceid)
                    if (!target) {
                        return
                    }
                    creep.memory["targetid"] = targetid
                }
            }
            targetid = creep.memory["targetid"]
            this.addlog("shipcreep", " target isnull reset to " + creep.memory["targetid"]
                , 20, target, creep.name, rolekey, targetid, sourceid)

        }
        let source: any;
        if (sourceid)
            source = this.getObjectById(sourceid)
        if (!source) {
            source = this.__creeprunGetSourceid(creep)
            sourceid = creep.memory["sourceid"]
            this.addlog("shipcreep", " source empty " + creep.memory["sourceid"]
                , 20, source, creep.name, rolekey, targetid, sourceid)
        }

        if (source && target
            && source.pos && target.pos && source.pos.isEqualTo(target) && rolekey != "backpower") {
            this.creepClearMemory(creep)
            this.addlog("shipcreep", " source.pos.isEqualTo(target) " 
                , 20, source, creep.name, rolekey, targetid, sourceid)
            return
        }

        if (!rolestep) {
            if (creep.store.getUsedCapacity() == 0)
                rolestep = "source"
            else
                //if (creep.store.getFreeCapacity() == 0)
                rolestep = "target"
            //else {
            //    //看哪个近点 
            //    if (!source) {
            //        rolestep = "target"

            //    }
            //    else if (!target) {
            //        rolestep = "source"

            //    }
            //    else {
            //        let neartarget = 999
            //        let nearsource = 999

            //        if (target && target.room && target.room.name == creep.room.name)
            //            neartarget = creep.pos.getRangeTo(target)
            //        else
            //            neartarget = 998
            //        if (source && source.room && source.room.name == creep.room.name)
            //            nearsource = creep.pos.getRangeTo(source)
            //        else
            //            nearsource = 998

            //        //如果离TARGET远 直接SOURCE
            //        if (neartarget == 998)
            //            rolestep = "source"
            //        else {
            //            if (neartarget < nearsource)
            //                rolestep = "target"
            //            else
            //                rolestep = "source"
            //        }
            //    }
            //}
            creep.memory["rolestep"] = rolestep;
        }
       
        this.addlog("shipcreep", " rolestep check " + rolestep + " " + sourceid + " " + targetid
            , 10, creep, creep.name, rolekey, targetid, sourceid)
        if (rolestep == "target") {
            this.AddLog(" tran  rolestep check1  :" + rolestep + targetid, 20, target);
            if (creep.store.getUsedCapacity() == 0) {
                rolestep = "source";
                creep.memory["rolestep"] = rolestep;
                if (enkindt == "spawn") {
                    delete creep.memory["targetid"];
                    //source = this.__creeprunGetSourceid(creep)
                    //delete creep.memory["sourceid"]//这里全删应该触发其它的了
                    this.addlog("shipcreep", " rolestep target store empty spawn " 
                        , 20, source, creep.name, rolekey, targetid, sourceid)
                }
                this.addlog("shipcreep", " rolestep target store empty  "
                    , 20, null, creep.name, rolekey, targetid, sourceid)
                this.AddLog(" tran2  goto source     :", 20);
                return;
            }
            if (enkindt == "spawn" && roomdata.room.energyAvailable ==
                roomdata.room.energyCapacityAvailable) {
                this.addlog("shipcreep", " rolestep target spawn full  "
                    , 20, null, creep.name, rolekey, targetid, sourceid)
                this.creepClearMemory(creep)
               
                return;
            }
         
            //if (enkindt == "spawn" && storage && targetid == storage.id)
            //    target = null
            if (target && enkindt == "spawn") {
                if (target.structureType != "extension" && target.structureType != "spawn") {
                    this.AddLog("test spawn target:" + target.structureType
                        , 20, target);
                    target = null
                }
            }
           
             


            if (!target || !target.store || target.store.getFreeCapacity() == 0) {
                delete creep.memory["targetid"];
                this.addlog("shipcreep", " rolestep target target full   " + targetid
                    , 20, target, creep.name, rolekey, targetid, sourceid)
                if (enkindt == "spawn") {
                    return;
                }
                if(roomname)
                    delete this.memoryclass[roomname]["t"][targetid]                
                creep.memory["lvt"]=-1
                this.creepClearMemory(creep)        
            
                return;
            }

            //补到多少 fullnum keepnum
            if (enkindt != "spawn" && target && target.store) {
                let fullnum = creep.memory["fullnumt"]
                let entype = creep.memory["entypet"]

                let storenum = target.store.getUsedCapacity(entype)
                if (fullnum > 0 && storenum > fullnum) {
                    this.addlog("shipcreep", " rolestep target target full  fullnum  " + targetid
                        , 20, target, creep.name, rolekey, targetid, sourceid)
                    delete this.memoryclass[roomname]["t"][targetid]
                    delete creep.memory["targetid"];
                    creep.memory["lvt"]=-1
                    this.creepClearMemory(creep)
                    this.AddLog("Creep target  full fullnum:"
                        + storenum + " " + fullnum
                        , 40, creep.pos);
                    return
                }

            }


            if (!creep.pos.isNearTo(target)) {
                //let startdes = null;// this._getstorage(roomname).pos
                //if (source)
                //    startdes = source.pos
                if (!target) {
                    this.AddLog(" tran    moveTo target target empty    :" + rolestep, 40, creep.pos);
                    //this.creepClearMemory(creep)
                    return;
                }

                //if (creep.memory["isdebug"])
                //if (creep.memory["istest"])
                //    global.RoleCenter.move78.moveTo(creep, targetid, startdes)
                //else
                creep.moveTo(target)
                this.addlog("shipcreep", " rolestep target moveto " + targetid
                    , 20, target, creep.name, rolekey, targetid, sourceid)
                //this.move78(creep, target.pos, 1, startdes)
                //else
                //this.moveto78(creep, target.pos, 1, startdes)
                this.AddLog(" tran target  moveTo     :" + rolestep, 20, target.pos);
                return;
            }
            let entype = creep.memory["entypet"] || RESOURCE_ENERGY
            let tmp
  
            
            for (let type in creep.store) {
                let typeget: any = type
                
                if (entype == RESOURCE_ENERGY && typeget != RESOURCE_ENERGY) {
                    tmp = creep.drop(typeget) 
                }
                else   
                    tmp = creep.transfer(target, typeget);
            
            }
            this.addlog("shipcreep",   " transfer  " + tmp
                , 20, target, creep.name, rolekey, targetid, sourceid)
         

            //let tmp = creep.transfer(target, RESOURCE_ENERGY);
            if (tmp == ERR_FULL) {
                delete creep.memory["targetid"]
                this.addlog("shipcreep",  enkindt +" rolestep target fill full " + targetid
                    , 20, target, creep.name, rolekey, targetid, sourceid)
                if (enkindt != "spawn") {
                    //rolestep = "source";
                    //creep.memory["rolestep"] = rolestep;
                    this.creepClearMemory(creep)
                    if (roomname && this.memoryclass[roomname] && this.memoryclass[roomname]["t"])
                        delete this.memoryclass[roomname]["t"][targetid]
                    this.AddLog("Creep   target full:" + this.logleave + targetid + " " + sourceid
                        , 20, creep.pos);
                    return;
                } else {

                    targetid = this._getTragetidSpawn(creep)
                    if (targetid == 999) return;//这个回合补了
                }


            }
            this.AddLog(" tran target  do     :" + tmp + rolestep + targetid, 20, creep.pos);

            return;
        }

        if (rolestep == "source") {

            if (creep.store.getFreeCapacity() == 0) {
                if (enkindt == "spawn")
                    delete creep.memory["targetid"];
                rolestep = "target";
                creep.memory["rolestep"] = rolestep;
              
                this.addlog("shipcreep", enkindt + " rolestep source empty to target " + targetid
                    , 20, target, creep.name, rolekey, targetid, sourceid)
                return;
            }
            //if (source && source.room) {
            //    //let roomtmp: BaseRoom = this.room78s[source.room.name]
            //    //if (roomtmp.creepsother && Object.keys(roomtmp.creepsother).length >= 1) {
            //    //    if (target) creep.moveTo(target)
            //    //    else creep.moveTo(this._getstorage(creep))
            //    //    return
            //    //}

            //}
            if (!source  ) {// (!source && lvs > 0)
                this.addlog("shipcreep", enkindt + " rolestep source  unkown " + targetid
                    , 20, target, creep.name, rolekey, targetid, sourceid)
                delete creep.memory["sourceid"];
                
                 this.creepClearMemory(creep)
                this.AddLog("Creep sourceid  empty:" + this.logleave + targetid + " " + sourceid
                    , 20, creep.pos);
                return;
            }
            //留到多少   keepnum
            if (source && source.store) {
                let keepnum = creep.memory["keepnums"] || 10
                let entype = creep.memory["entypes"] || RESOURCE_ENERGY
                if (entype == "ext") entype = ""
                let storenum = source.store.getUsedCapacity(entype)
                if (storenum <= keepnum) {
                    this.addlog("shipcreep", enkindt + " rolestep source  <=keepnum " + sourceid
                        , 20, source, creep.name, rolekey, targetid, sourceid)
                    delete creep.memory["sourceid"];
                    this.creepClearMemory(creep)
                    this.AddLog("Creep sourceid store keepnum over:"
                        + this.logleave + storenum + " " + keepnum
                        , 20, source);
                    return
                }
            }
            //if (source && source["store"] && source["store"].getUsedCapacity() < 100) {
            //    delete creep.memory["sourceid"];
            //    this.creepClearMemory(creep)
            //    this.AddLog("Creep sourceid store empty:" + this.logleave + targetid + " " + sourceid
            //        , 20, creep.pos);
            //    return;
            //}
            if (!creep.pos.isNearTo(source)) {
                let startpos = null// creep.pos
                if (target)
                    startpos = target.pos
                if (!source) {
                    this.addlog("shipcreep", enkindt + " rolestep source moveto sourceempty " + sourceid
                        , 20, source, creep.name, rolekey, targetid, sourceid)
                    this.AddLog(" tran source  moveTo sourceempty    :" + rolestep, 20, source);
                    this.creepClearMemory(creep)
                    return;
                }
                //if (creep.memory["isdebug"])
                //if (creep.memory["istest"])
                //    global.RoleCenter.move78.moveTo(creep, sourceid, startpos)
                //else
                creep.moveTo(source)
                //this.move78(creep, source.pos, 1, startpos)
                //else
                //    this.moveto78(creep, source.pos, 1, startpos)
                this.AddLog(" tran source  moveTo     :" + rolestep, 20, source.pos);
                return;
            }

            let tmp;
            let entype = creep.memory["entypes"]
            if (entype == "ext") {
                if (source.store) {
                    for (let type in source.store) {
                        let typeget: any = type
                        tmp = creep.withdraw(source, typeget);
                    }
                }
            }
            else
                tmp = creep.withdraw(source, RESOURCE_ENERGY);


            if (tmp != 0) { 
                tmp = creep.pickup(source)
                
            }
            if (tmp != 0) {
                if (this.memoryclass[roomname]) {
                    delete this.memoryclass[roomname]["s"][sourceid]

                }
                this.addlog("shipcreep", enkindt + " rolestep source geterr " + sourceid
                    , 20, source, creep.name, rolekey, targetid, sourceid)    
                delete creep.memory["sourceid"]
            }

            this.AddLog(" tran source withdraw  do  normal   :" + tmp + rolestep + sourceid, 20, creep.pos);

            return
        }

    }

    __creeprunGetTargetid(creep: Creep) {
        let target;
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name)
        let storage = roomdata.getstorage()
        this.AddLog("Creeprum source empty   :", 10, storage);
        if (storage) {
            target = this.getObjectById(storage.id)
            creep.memory["targetid"] = storage.id
            return target

        }
       
        //没有随便找个仓库
        let contains = roomdata.getstructByType(STRUCTURE_CONTAINER)
        let tmpsource
        let maxenergy = 0
        this.AddLog("Creeprum source empty  storage empty contains test  :", 10, contains);
        for (let tmpsouceid in contains) {
            let tmpid: any = tmpsouceid
            tmpsource = this.getObjectById(tmpid)
            this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                + " " + maxenergy, 10, contains);
            if (tmpsource.store.getFreeCapacity() > maxenergy) {
                maxenergy = tmpsource.store.getFreeCapacity()
                creep.memory["targetid"] = tmpid
                target = tmpsource;
            }

        }
        this.AddLog("Creeprum source empty  storage empty storeoceid  :", 10, target);
        if (!target) {
            //找附近的
            let nexts = this.getNextRooms(creep.room.name)
            let energy = 9999999999
            let nextroomstorage = null
            if (nexts) {
                for (var i = 0; i < nexts.length; i++) {
                    let nextname = nexts[i]
                    let roomdata = this.roomdatas.getRoomdata(nextname)
                    if (!roomdata) continue;
                    contains = roomdata.getstructByType(STRUCTURE_CONTAINER)
                    for (let tmpsouceid in contains) {
                        let tmpid: any = tmpsouceid
                        tmpsource = this.getObjectById(tmpid)
                        this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                            + " " + maxenergy, 10, contains);
                        if (tmpsource.store.getFreeCapacity() > maxenergy) {
                            maxenergy = tmpsource.store.getFreeCapacity()
                            creep.memory["targetid"] = tmpid
                            target = tmpsource;
                        } 
                    }
                }
            }
        }

         
      
        return target
    }

    __creeprunGetSourceid(creep: Creep) {
        let source;
        //默认罐子
        let roomdata = this.roomdatas.getRoomdata(creep.room.name)
        let storage = roomdata.getstorage()
        this.AddLog("Creeprum source empty   :", 10, storage);
        if (storage) {
            source = this.getObjectById(storage.id)
            creep.memory["sourceid"] = storage.id
        }
        else {
            //没有随便找个仓库
            let contains = roomdata.getstructByType(STRUCTURE_CONTAINER)
            let tmpsource
            let maxenergy = 0
            this.AddLog("Creeprum source empty  storage empty contains test  :", 10, contains);
            for (let tmpsouceid in contains) {
                let tmpid: any = tmpsouceid
                tmpsource = this.getObjectById(tmpid)
                this.AddLog("Creeprum source empty  storage empty contains test  :" + tmpsource.store[RESOURCE_ENERGY]
                    + " " + maxenergy, 10, contains);
                if (tmpsource.store[RESOURCE_ENERGY] > maxenergy) {
                    maxenergy = tmpsource.store[RESOURCE_ENERGY]
                    creep.memory["sourceid"] = tmpid
                    source = tmpsource;
                } 
            }
            this.AddLog("Creeprum source empty  storage empty storeoceid  :", 10, source);
            //这里要改成获取一个能量源
            for (let tmpsouceid in  this.getMemoryclass()[creep.room.name]["s"]) {
                let roletmp = this.getMemoryclass()[creep.room.name]["s"][tmpsouceid]
                let tmpid = roletmp["roletargetid"]
                //tmpsource = this.getObjectById(tmpid)
                if (roletmp["neednum"] > maxenergy) {
                    maxenergy = roletmp["neednum"]
                    creep.memory["sourceid"] = tmpid
                    source = tmpsource;
                } 
            }
             
        }
    
        return source
    }
    /**
     * 处理douser
     * */
    __creeprundouser(creep: Creep) {
        
        let lvs = creep.memory["lvs"]
        let lvt = creep.memory["lvt"]
        let targetid = creep.memory["targetid"];
        let sourceid = creep.memory["sourceid"];
        let roomname = creep.memory["roomname"]
 
        if (!roomname || !this.memoryclass[roomname] || !this.memoryclass[roomname]["s"]) {
             return;
        }
        if (lvs > 0) {
            let role = this.memoryclass[roomname]["s"][sourceid + this.classname]
            //if (!role) {
            //    this.AddLog("__creeprundouser err role empty sourceid:"  + sourceid + this.classname, 50, creep.pos);
            //    return;
            //}
            this.AddLog("test __creeprundouser douser:" + sourceid + this.classname, 10, role);
            if (role &&!role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creepname: creep.name 
                    , store: creep.store.getCapacity()
                };
            } 
        }
        if (lvt > 0) {
            let role = this.memoryclass[roomname]["t"][targetid + this.classname] 
            let enkindt = creep.memory["enkindt"]
            if (enkindt == "spawn")
                role = this.memoryclass[roomname]["t"][roomname + enkindt + this.classname] 
            //if (!role) {
            //    this.AddLog("__creeprundouser err role empty:" + enkindt + targetid + this.classname, 50, creep.pos);
            //    return;
            //}
            if (role && !role["dousers"][creep.name]) {
                role["dousers"][creep.name] = {
                    creepname: creep.name
                    , store: creep.store.getCapacity()
                };
            }
        }
    }

    _getTragetidSpawn(creep: Creep) {
        let targetid;
        let lvt = creep.memory["lvt"]
        let roomname = creep.room.name

        let room78 = this.roomdatas.getRoomdata(roomname)
        //if (!room78 || !room78.spawnname) 
        if (!room78 ) {
            this.AddLog(" room78 is empty  :" + roomname, 40, creep.pos);
            this.creepClearMemory(creep)
            return "";
        }
        let spawn 
        if ( room78.spawnname) {
            spawn = Game.spawns[room78.spawnname]   
            
        }
       
        //spawn = Game.spawns[room78.spawnname]
        //this.AddLog(" tranauto _getTragetidSpawn   find  CHECK  :"
        //    + roomname + spawn.store.getFreeCapacity(RESOURCE_ENERGY), 10, spawn);

      
        //extend最近的
        let structs = room78.getstructByType("extension")
        this.AddLog(" tranauto targetid extension find   :" + targetid, 10, structs);
        let nearmax = 999
        if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            nearmax = creep.pos.getRangeTo(spawn.pos)
            targetid = spawn.id;
            return targetid;
            //creep.memory["targetid"] = targetid
            this.AddLog(" tranauto _getTragetidSpawn  check nearmax :"
                + nearmax + spawn.store.getFreeCapacity(RESOURCE_ENERGY), 10, spawn.pos);
        }
        for (let key in structs) {
            let stuid: any = key;
            let structtmp: any = this.getObjectById(stuid)// structs[ckey]
            //let structtmp = structs[key]
            if (structtmp["store"].getFreeCapacity(RESOURCE_ENERGY) == 0)
                continue;
            if (creep.pos.isNearTo(structtmp)) {
                if (creep.store.getUsedCapacity() == 0)
                    return structtmp.id
                creep.transfer(structtmp, RESOURCE_ENERGY)
                this.AddLog(" tranauto targetid extension isnear do over   :"
                    + structtmp["store"].getFreeCapacity(RESOURCE_ENERGY), 10, structtmp.pos);

                return 999;
            }
            this.AddLog(" tranauto targetid extension find   :"
                + structtmp["store"].getFreeCapacity(RESOURCE_ENERGY), 0, structtmp.pos);

            let nearnow = creep.pos.getRangeTo(structtmp.pos)
            if (nearnow < nearmax) {
                nearmax = nearnow
                targetid = structtmp.id
                this.AddLog(" tran transpawn change transpawn_extend :"
                    + nearnow + " " + structtmp.id, 20, structtmp.pos);

            }
            if (nearmax == 0)
                break;
        }

        if (targetid) {
            creep.memory["targetid"] = targetid
            return targetid;
        }

        return targetid
    }

    /**
    * 只保留ckind
    * @param creep
    */
    creepClearMemory(creep: Creep) {
        let ckind = creep.memory["ckind"]
        let targetid = creep.memory["targetid"];
        let rolekind = creep.memory["rolekind"];
        let sourceid = creep.memory["sourceid"];
        let roomname = creep.memory["roleroom"];
        let isdebug = creep.memory["isdebug"];
        if (roomname) {
            if (!this.memoryclass[roomname]) this.memoryclass[roomname] = {}
            if (!this.memoryclass[roomname]["s"]) this.memoryclass[roomname]["s"] = {}

            if (!this.memoryclass[roomname]["t"]) this.memoryclass[roomname]["t"] = {}
            let roomrole = this.memoryclass[roomname]["s"]
            if (sourceid && roomrole && roomrole[sourceid])
                delete roomrole[sourceid]["dousers"][creep.name]

            roomrole = this.memoryclass[roomname]["t"]
            if (targetid && roomrole && roomrole[targetid] && roomrole[targetid]["douser"]) {
                this.AddLog("creepClearMemory :" + targetid, 10, creep.pos);
                delete roomrole[targetid]["douser"][creep.name]
            }
        } 

        delete Memory.creeps[creep.name]
        creep.memory["ckind"] = ckind
        //creep.memory["roomname"] = creep.room.name
        creep.memory["local"] = creep.room.name
        creep.memory["rolekind"] = rolekind
        creep.memory["isdebug"] = isdebug
        //不要站在路上
        if (creep.memory["isnotrold"]) return;
        const found = creep.pos.look();
        this.AddLog(" test isnotrold:"
            + creep.memory["isnotrold"], 10, creep.pos);
        let isnotrold = true;
        for (let m = 0; m < found.length; m++) {
            let type = found[m]["type"];
            if (type == "structure"  ) {
                let structureType = found[m]["structure"]["structureType"];
                if (structureType == "road") {
                    isnotrold = false
                    break;
                }
            }
        }
        //this.AddLog(" test:" + isnotrold, 10, found);
        if (isnotrold) {
            creep.memory["isnotrold"] = 1
            return;
        }

        //看附近哪有没有路的地方 随便站过去就行了
        for (var x = -1; x < 1; x++) {
            for (var y = -1; y < 1; y++) {
                if (x == 0 && y == 0) continue;
                let nextdes = new RoomPosition(creep.pos.x + x, creep.pos.y + y, creep.room.name);
                const found = creep.pos.look();
                let isnotrold = true;
                for (let m = 0; m < found.length; m++) {
                    let type = found[m]["type"];
                    if (type == "structure") {
                        let structureType = found[m]["structure"]["structureType"];
                        if (structureType == "road") {
                            isnotrold = false
                            break;
                        }
                    }
                }
                if (!isnotrold) continue;
                creep.moveTo(nextdes)
            }
        }
    }

  
    /**
    * 添加请求
    * @param targetid
    * @param st
    * @param enkind
    * @param neednum
    * @param entype
    * @param fullnum 补到多少
    * @param keepnum 留多少
    * @param sourceid 直接指定了对向的id指定运输 优先级定高点 不给改
    * @param roomnamein spawn没有roomname必须指定
    */
    addplan(targetid, st, enkind, neednum, entype = "energy", fullnum = 0, keepnum = 0, sourceid = "", roomnamein = "") { 
        let creeps = this.roomdatas.creeps[this.classname];
        this.addlog("ship78addplan", targetid + " " + st + " " + enkind,20,null, targetid)
        //添加任务
        let role = this.role_addplan(targetid, st, enkind, neednum, entype, fullnum, keepnum, sourceid, roomnamein)
        this.AddLog("  addplan  init :" + targetid + st
            + enkind, 20, this.memoryclass)
        if (!role) {
            this.AddLog("  addplan  role empty :" + targetid + st
                + enkind, 50)
            return;
        }
        if (st == "t") {
            this._addplanTchangeS(role, st, neednum, enkind, keepnum, fullnum, entype, sourceid)

            this._addplanCheckdouser(role, st, enkind, neednum, sourceid);
            if (role["localcreep"] >= 1) {
                this.spawn78.delplan(role["rolekey"])
                return;
            }
            let isadd =this._addplanfindcreept(role, st, neednum, enkind, keepnum, fullnum, entype, sourceid);  
            if (!isadd)
                this.spawn78.delplan(role["rolekey"])
            return
        }
  
        //if (enkind == "spawn")
        //    this.logleave = 25;
        //else
        //    this.logleave = this.logleaveAuto
        this.AddLog("addplan  roleget :" + targetid + st + " " + enkind, 25)
        this.addlog("ship78addplans", " _addplandousernum init:" + targetid, 10, role, targetid
        )
        //调度是否需要增加 爬个数 不return就是增加
        if (!this._addplandousernum(role, st, enkind, neednum, sourceid)) {
            this.spawn78.delplan(role["rolekey"])
            return;
        }
        this.addlog("ship78addplans", " _addplandousernum ok:" + targetid, 10, role, targetid
            )
       
        //找到一个爬
        if (!this._addplanfindcreep(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "")) {
            this.spawn78.delplan(role["rolekey"])
            return;
        }
           
        this.addlog("ship78addplans", " _addplanfindcreep ok:" + targetid, 10, role, targetid
        )
       
        //最后再判断要不要申请
        let roomname = role["roomname"]
        let rolekey = role["rolekey"] 

        let createlvtmp = this.createlv;
        if (!creeps || Object.keys(creeps).length <= 2) {
            createlvtmp += 70        
            //this.AddLog("addplan  this.creeps <=2 check creeps isempty:" + this.shipstore, 50, creeps)  
        }
        let lv = role["lv"]    
        //没找到 请求新建 //如果一个都没了 就加30
        this.spawn78.addplan(rolekey, createlvtmp , {
            memory: {
                rolekind: this.classname
                , roleroom: roomname
                , rolekey: rolekey//唯一标记
                , ckind: this.botkind//有可能一种机型不同的任务的
                , sourceid: targetid
                , lvs: lv, entypes: entype
                , keepnumt: keepnum
                , fullnumt: fullnum
            }
        })
        this.addlog("ship78addplan", " spawn78.addplan:" , 20
            , null, sourceid)
        this.AddLog("  addplan  check over not find reqlistadd:" + roomname
            + enkind, 26, role)
    }

    /**
     * T任务锁定S 几个回合判断一次
     * .同房间的 与T最近的S 
     * .不同房间的话 取最多的S(一般应该有 几回合判断一次很快就会出来应该)
     * */
    _addplanTchangeS(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = "") {
        let tsourceid = role["sourceid"];
        let rolekey = role["rolekey"];
        //if (tsourceid && !this.iscanref(rolekey)) { 
        //    return;
        //}
        let roomname = role["roomname"]
        let roletargetid = role["roletargetid"]
        let room78 = this.roomdatas.getRoomdata(roomname)
        if (enkind == "spawn") {
            roletargetid = Game.spawns[room78.spawnname].id;
        }
        let target = this.getObjectById(roletargetid)

        //先找本房间的最近的S
        let newsourceid,newsource,newlv
        let nearmax = 99999
        this.AddLog("test _addplanTchangeS:" + roletargetid , 20, target.pos)
        for (let rolename in this.memoryclass[roomname]["s"]) {
            let roletmp = this.memoryclass[roomname]["s"][rolename]
            let tmpid = roletmp["roletargetid"]
            let tmplv = roletmp["lv"]
            let sourceobj:any = this.getObjectById(tmpid)            
            if (!sourceobj) {
                this.addlog("ship78addplan",    "_addplanTchangeS roletargetid empty:" 
                    , 20, roletmp, rolekey)
                this.AddLog( "err _addplanTchangeS: source empty"    + tmpid, 20, sourceobj)
                continue
            }
            let neartmp = target.pos.getRangeTo(sourceobj)
            let store = roletmp["store"] 
            let isentypeok = false
            let roleentype = role["entype"]
            for (let entypetmp in store) {
                if (roleentype == entypetmp) {
                    isentypeok = true
                    break;
                }
            }
            if (!isentypeok) {
                this.addlog("ship78addplan", "_addplanTchangeS !isentypeok:"+sourceid
                    , 20, roletmp, rolekey)
                continue
            }
              
            if ( store &&  !store["energy"]) {
                delete this.memoryclass[roomname]["s"][rolename]
                this.addlog("ship78addplan", "_addplanTchangeS store no energy del s:"
                    , 20, roletmp, rolekey)
                this.AddLog(" creep run delete s  rolename:"   + sourceid, 90, sourceobj);
                continue
            }
            if (store["energy"] < 500) continue;
            this.AddLog(nearmax+"_addplanTchangeS:" + neartmp
                + tmpid, 20, sourceobj)
            if (neartmp < nearmax) {
                this.addlog("ship78addplan", newsourceid + "_addplanTchangeS neartmp < nearmax:" + tmpid
                    , 20, sourceobj, rolekey)
                nearmax = neartmp
                newsourceid = tmpid
                newsource = sourceobj 
                newlv=tmplv
            }
        }
        if (!newsourceid) {
            if (room78.room.storage && room78.room.storage.store["energy"] >= 500) { 
                newsourceid = room78.room.storage.id
                newsource = room78.room.storage
                this.addlog("ship78addplan",   "_addplanTchangeS !newsourceid:"  
                    , 20, null, rolekey)
            }
        }

        //补仓要把仓库和罐子加进来
        if (enkind == "spawn") {
            let storage = room78.room.storage
            if (storage && storage.store["energy"] >= 500) { 
                let neartmp = target.pos.getRangeTo(room78.room.storage)
                if (neartmp < nearmax) {
                    nearmax = neartmp
                    newsourceid = room78.room.storage.id
                    newsource = room78.room.storage
                    newlv=-1
                    this.addlog("ship78addplan", newsourceid + "_addplanTchangeS neartmp < nearmax:"
                        + newsourceid
                        , 20, room78.room.storage, rolekey)
              
                }
            }

        }

        if (newsourceid && role["sourceid"]!=newsourceid) {
            role["sourceid"] = newsourceid
            role["spos"] = newsource["pos"] 
            role["sstore"] = newsource["store"] 
            role["slv"]=newlv
            this.addlog("ship78addplan", "_addplanTchangeS  newsourceid set :" + newsourceid
                , 20, newsource, rolekey)
            for (let creepname in role["dousers"]) {
                let creep = Game.creeps[creepname]
                if (creep) {
                    creep.memory["lvs"] = newlv
                    creep.memory["entypes"] = entype
                    creep.memory["enkinds"] = "t"
                    creep.memory["keepnums"] = 0
                    creep.memory["sourceid"] = newsourceid
                }
            }
            return;
        }
    }

 

    /**
     * 如果是T任务 
     * .先确定最近的S T和S同优先级
     * .隔几个回合检查一次 看有没有更近的爬 如果爬是满资源 距离以T 如果爬是空资源 距离以S计
     * */
    _addplanfindcreept(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = ""): boolean {
        //return true
        let repcreep = role["repcreep"];
        let roomname = role["roomname"]
        let rolekey = role["rolekey"]
        let roletargetid = role["roletargetid"]
        let findcreep = "" 
        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的 
        findcreep = this._getcreept(roomname, role, st)
        this.AddLog("addplan  find this room findcreep:" + findcreep + roomname, 26)
 
        let nexts = this.getNextRooms(roomname)
        let findnear = 0//看找的是隔壁还是隔壁的隔壁决定是不是要换 997隔壁 998隔壁的隔壁
        if (!findcreep) {
            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._getcreept(nexts[i], role, st)
                if (findcreep) {
                    findnear = 997
                    break;
                }
            }
        }
        this.AddLog("addplan  find next room findcreep:" + findcreep + roomname, 26, nexts)
        if (!findcreep) {
            //再隔壁的隔壁  
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i])
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._getcreept(nexts2[j], role, st)
                    if (findcreep) {
                        findnear = 998
                        break;
                    }
                }
            }
        }
        this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 25)

        let refnear = role["refnear"];
        let lv = role["lv"]
        //if (findcreep && role["findcreep"] && role["findcreep"] != findcreep) {
        //    return 
        //}
        //找出来再判断是替换还是加上
        if (findcreep ) { 
            //如果有不在本房间的douser 且加一个后处理能力大了 就要替换
            if (repcreep && repcreep !=findcreep) {
                //if (refnear <= findnear) return;//没必要换
                let creeptmp: Creep = Game.creeps[repcreep]
                delete role["dousers"][repcreep]
                if (st == "s") {
                    delete creeptmp.memory["sourceid"]
                    delete creeptmp.memory["lvs"]
                    delete creeptmp.memory["enkinds"]
                } else {
                    delete creeptmp.memory["targetid"]
                    delete creeptmp.memory["lvt"]
                    delete creeptmp.memory["enkindt"]
                }
            }
            let creep: Creep = Game.creeps[findcreep]

            this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 27,creep)
            role["dousers"][findcreep] = {
                creepname: findcreep, near: findnear
                , store: creep.store.getCapacity()
            };

            if (!creep.memory["rolekey"]) {
                creep.memory["rolekey"] = rolekey;
            }
            creep.memory["trolekey"] = rolekey;
            creep.memory["lvt" ] = lv
          
            creep.memory["entype" + st] = entype
       
            creep.memory["keepnum" + st] = keepnum
            creep.memory["fullnum" + st] = fullnum
            creep.memory["rolekind"] = this.classname
            creep.memory["roomname"] = role["roomname"]
            if (enkind != "spawn")
                creep.memory["targetid"] = role["roletargetid"]
            else {
                //if (creep.memory["enkindt"] != enkind)
                //    creep.memory["targetid"] = role["roletargetid"]
                if (enkind != creep.memory["enkindt"])
                    delete creep.memory["targetid"] 
                this.addlog("ship78addplan", " findcreep test check enkind:" + creep.name
                    + creep.memory["enkindt"] + enkind + creep.memory["targetid"], 20
                    , creep, sourceid, roletargetid, creep.name)
            }
            creep.memory["enkind" + st] = enkind
            //S也一起安排了
            creep.memory["lvs" ] = lv
            creep.memory["entypes" ] = entype
            creep.memory["enkinds"] = "t"
            creep.memory["keepnums"] = 0
            creep.memory["sourceid"] = role["sourceid"]
            if (role["findcreep"] != creep.name) {
                delete creep.memory["rolestep"]
                role["findcreep"] = creep.name
            }
            this.addlog("ship78addplan", roletargetid+ " findcreep ok:" + creep.name, 27
                , creep, sourceid, roletargetid, creep.name)
            this.AddLog("test _addplanfindcreept change:" + rolekey, 27, creep.pos)
            return false
        }

        //新建
   
        let creeps = this.roomdatas.creeps[this.classname];
        let createlvtmp = this.createlv;
        if (!creeps || Object.keys(creeps).length <=  1   ) {
            createlvtmp += 70
            //this.AddLog("addplan  this.creeps <=2 check creeps isempty:" + this.shipstore, 50, creeps)
        }
        this.addlog("ship78addplan", " t addplan  check over not find reqlistadd:" + roomname
            + enkind, 10, creeps, sourceid, roletargetid, roomname, rolekey)
        //没找到 请求新建 //如果一个都没了 就加30
        this.spawn78.addplan(rolekey, createlvtmp, {
            memory: {
                rolekind: this.classname
                , roleroom: roomname
                , rolekey: rolekey//唯一标记
                , ckind: this.botkind//有可能一种机型不同的任务的
                , targetid: sourceid
                , lvt: lv, entypet: entype
                , enkindt: enkind, keepnumt: keepnum
                , fullnumt: fullnum
                , lvs: lv, entypes: entype
                , enkinds: "t", keepnums: 0
            }
        })
        this.addlog("ship78addplan", " spawn78.addplan t:" + rolekey, 20
            , null, sourceid, roletargetid)
        //this.AddLog("test _addplanfindcreept addplan create:" + rolekey, 50 )
        this.AddLog("  addplan  check over not find reqlistadd:" + roomname
            + enkind, 26, role)
        return true
    }

    /**
     * 添加任务 ok
     * */
    role_addplan(targetid, st, enkind, neednum, entype = "energy", fullnum = 0, keepnum = 0, sourceid = "", roomnamein = "") {
        this.AddLog("  addplan2 in roomrole:" +
            this.logleave + enkind + targetid + roomnamein, 20)
        let target: any = this.getObjectById(targetid)
        let roomname = roomnamein;
        if (target) roomname = target.room.name
        if (!target && enkind != "spawn")
            return;

        this.logleave = this.logleaveAuto
        
        if (!this.getMemoryclass()[roomname]) this.getMemoryclass()[roomname] = {}
        if (!this.getMemoryclass()[roomname][st]) this.getMemoryclass()[roomname][st] = {}
        let roomrole = this.getMemoryclass()[roomname][st]
        this.AddLog("  addplan2 in target:" + enkind + targetid + neednum, 10, target)
        this.AddLog("  addplan2 in roomrole:" +
            this.logleave + roomname + enkind + targetid, 26, roomrole)

        let lv = 50
        let rolekey = targetid
        if (enkind == "spawn")
            rolekey = roomnamein + enkind
        rolekey+=this.classname
        switch (enkind) {
            case "terminal"://t
            case "tower"://t
                lv = 100;
                break;
            case "spawn"://t
                lv = 99;
                break;
            case "linkstorage"://t
                lv = 85;
                break;
            case "storecreep"://t
                lv = 75;
                break;
            case "storeup"://t 
                lv = 70;
                //if (room78.linkup)//直接请求的时候换
                //    id = room78.linkstorage
                break;
            case "sourceext":
                lv = 90
                break;
            case "resoucebig"://s捡的大资源
                lv = 86
                if (neednum < 200)
                    lv = 20
                break;
            case "sourcenormal"://s可能是边缘
                lv = 20
                break;
            case "sourceoce"://s有在挖矿的池子
                lv = 30;
                if (neednum >= 1500)
                    lv = 60;
                else if (neednum >= 800)
                    lv = 40;
                break;
            default:
                this.AddLog("  addplan  kind err:" + enkind, 40, target)
                return;
        }

        //不能一边补一边拉 如果有s==t的 清空爬的sourceid
        //if (st == "t") {
            //this.AddLog("  addplan  check s ==t:"
            //    + (this.memoryclass[roomname]["s"][id]), 0
            //    , this.memoryclass[roomname]["s"])
            //if (this.memoryclass[roomname]["s"][id]) {
            //    let dousers = this.memoryclass[roomname]["s"][id]["dousers"]
            //    this.AddLog("  addplan  check s ==t dousers:" + id, 0
            //        , dousers)
            //    for (let cpname in dousers) {
            //        let creep: Creep = Game.creeps[cpname]
            //        if (creep) {
            //            delete creep.memory["sourceid"]
            //            delete creep.memory["lvs"]
            //        }
            //    }
            //    delete this.memoryclass[roomname]["s"][id]
            //}
        //}

        //看是不是新的
        let role;


        if ( !roomrole[rolekey]) {
            this.getMemoryclass()[roomname][st][rolekey] = {
                rolekey: rolekey, enkind: enkind
                , roomname: roomname, id: rolekey
                , lv: lv, neednum: neednum, entype: entype
                , dousers: {}
                , roletargetid: targetid
            }
            role = this.getMemoryclass()[roomname][st][rolekey]
            this.AddLog("  addplan2 test33 add role:" + roomname, 20, Memory["rolelist78"][this.classname][roomname])
            //this.AddLog("  addplan2 test33 add role22:" + roomname, 29, this.getMemoryclass()[roomname])
        }
        else {
            role = roomrole[rolekey]
            //交易中心补货 一次只补一个类型
            if (enkind == "terminal" && role["entype"] && role["entype"] != entype) return
            role["lv"] = lv
            role["rolekey"] = rolekey
            role["enkind"] = enkind
            role["roomname"] = roomname
            role["id"] = rolekey
            role["neednum"] = neednum
            role["entype"] = entype
        }
        if (enkind != "spawn") {
            role["pos"] = target.pos
            if (target.store)
                role["store"] = target.store
            else {
                //资源
                role["store"] = {}
                role["store"][target.resourceType]= target.amount
            }
        }
            

        role["keepnum"] = keepnum
        role["fullnum"] = fullnum
        this.addlog("ship78addplan", targetid + " " + st + " " + enkind, 20, role, targetid, rolekey)
        this.AddLog("  addplan2 test33 role:" + enkind, 20, role)
        return role;
    }

  
   
    _addplanfindcreep(role, st, neednum, enkind, keepnum = 0, fullnum = 0, entype = "energy", sourceid = ""): boolean {
        let repcreep = role["repcreep"];
        let roomname = role["roomname"]
        let rolekey = role["rolekey"]
        let roletargetid = role["roletargetid"]
        let findcreep = ""
        //if (enkind == "spawn")
        //    this.logleave = 10;
        //else
        //    this.logleave = this.logleaveAuto

        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的

        findcreep = this._getcreep(roomname, role, st)
        this.AddLog( roomname+"addplan  find this room findcreep:" + findcreep , 26)
        let nexts = this.getNextRooms(roomname)
        let findnear = 0//看找的是隔壁还是隔壁的隔壁决定是不是要换 997隔壁 998隔壁的隔壁
        if (!findcreep) {
            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._getcreep(nexts[i], role, st)
                if (findcreep) {
                    findnear = 997
                    break;
                }
            }
        }
        this.AddLog("addplan  find next room findcreep:" + findcreep + roomname, 26, nexts)
        if (!findcreep) {
            //再隔壁的隔壁  
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i])
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._getcreep(nexts2[j], role, st)
                    if (findcreep) {
                        findnear = 998
                        break;
                    }
                }
            }
        }
        this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 25)

        let dousernum = Object.keys(role["dousers"]).length
        let refnear = role["refnear"];
        let lv = role["lv"]
        //找出来再判断是替换还是加上
        if (findcreep) {

            //如果有不在本房间的douser 且加一个后处理能力大了 就要替换
            if (repcreep && (dousernum + 1) * this.shipstore > neednum) {
                if (refnear <= findnear) return;//没必要换
                let creeptmp: Creep = Game.creeps[repcreep]
                delete role["dousers"][repcreep]
                if (st == "s") {
                    delete creeptmp.memory["sourceid"]
                    delete creeptmp.memory["lvs"]
                    delete creeptmp.memory["enkinds"]
                } else {
                    delete creeptmp.memory["targetid"]
                    delete creeptmp.memory["lvt"]
                    delete creeptmp.memory["enkindt"]
                }
            }
            let creep: Creep = Game.creeps[findcreep]

            role["dousers"][findcreep] = {
                creepname: findcreep, near: findnear
                , store: creep.store.getCapacity()
            };
            this.addlog("ship78addplan", " _getcreep douser add:" + findcreep, 20
                , creep, findcreep, roletargetid)
            if (!creep.memory["rolekey"]) {
                creep.memory["rolekey"] = rolekey;
            }
            creep.memory["srolekey"] = rolekey;
            creep.memory["lv" + st] = lv
            creep.memory["entype" + st] = entype
            creep.memory["enkind" + st] = enkind
            creep.memory["keepnum" + st] = keepnum
            creep.memory["fullnum" + st] = fullnum
            creep.memory["rolekind"] = this.classname
            creep.memory["roomname"] = role["roomname"]
            delete creep.memory["rolestep"]
            //直接找到罐子
            let roomdata = this.roomdatas.getRoomdata(creep.room.name)
            let storage = roomdata.getstorage()
            let storageid;
            if (storage)
                 storageid = storage.id
            //let room78: BaseRoom = this.room78s[roomname]
            //if (room78.room.storage) {
            //    storageid = room78.room.storage.id
            //} else {
            //    //那就肯定有运输到的地方
            //    let targetroomname = this.reqlist9["rtranauto"][roomname]
            //    if (!this.room78s[targetroomname]) {
            //        this.AddLog("addplan err targetroomname undef:" + targetroomname, 40, creep.pos)
            //        return;
            //    }
            //    storageid = this.room78s[targetroomname].room.storage.id
            //}
            let olddouserids, olddouseridt
            let refs = false;
            if (st == "t") {
                //分T时 s和T 必须在同一个房间 不是就清掉S
                olddouseridt = creep.memory["targetid"]
                if (olddouseridt) {
                    //清理任务表原来的targetid douser
                    if (this.memoryclass[roomname]
                        && this.memoryclass[roomname]["t"]
                        && olddouseridt && this.memoryclass[roomname]["t"][olddouseridt]) {
                        delete this.memoryclass[roomname]["t"][olddouseridt]["dousers"][creep.name]
                    }
                }
                if (enkind != "spawn")
                    creep.memory["targetid"] = role["roletargetid"]
                //else
                //    delete creep.memory["targetid"]

                let sourceid = creep.memory["sourceid"]
                let source: any = this.getObjectById(sourceid)
                if (source && source.room.name != roomname && storageid)
                    refs = true


            }
            if (st == "s" || refs) {

                olddouserids = creep.memory["sourceid"]
                if (olddouserids) {
                    //清理任务表原来的sourceid douser
                    if (this.memoryclass[roomname]
                        && this.memoryclass[roomname]["s"]
                        && olddouserids && this.memoryclass[roomname]["s"][olddouserids]) {
                        delete this.memoryclass[roomname]["s"][olddouserids]["dousers"][creep.name]
                    }
                }
                if (st == "s") {
                    creep.memory["sourceid"] = role["roletargetid"]
                    if (sourceid) {
                        creep.memory["targetid"] = sourceid
                        creep.memory["lvs"] = 100
                        creep.memory["lvt"] = 100
                    }

                }

                if (refs) {
                    creep.memory["sourceid"] = storageid
                    creep.memory["lvs"] = -1
                    delete creep.memory["enkinds"]
                }
            }
            return false
        }
        if (lv <= 30) return false;
        if (dousernum >= 1 && dousernum * this.shipstore * 2 > neednum)
            return false
        return true;
    }

    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _getcreept(lockroom, role, st): string {
        let ckind = this.botkind
        let lv = role["lv"]
        let rolekey = role["rolekey"]
        let roomname = role["roomname"]
        let enkind = role["enkind"]
        let findcreep = role["findcreep"]
         
        let creepfindtmp = Game.creeps[findcreep]
        if (!creepfindtmp) {
            delete role["findcreep"]
            findcreep = ""
        } else {
            if (creepfindtmp.memory["rolekey"] != rolekey) {
                delete role["findcreep"]
                findcreep = ""
            }
        }
            

        let roomdata = this.roomdatas.getRoomdata(lockroom)
        if (!roomdata) return;
        let roletargetid = role["roletargetid"]
        let sourceid = role["sourceid"]
        let source = this.getObjectById(sourceid)
        let roletarget: any = this.getObjectById(roletargetid)
        if (!roletarget) {
            this.AddLog("  _addplan  check douser1111  targeterr :" + roletargetid
                , 40, roletarget)
            return "";
        }
        let creeps = roomdata.getlocalcreeps(ckind)
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps)
        if (!creeps) return ""
        let nearmax = 999;
        let nearnow
        let findcreepold = role["findcreep"]
        let creepold = Game.creeps[findcreepold]
        if (!creepold || creepold.room.name != roomname)
            findcreepold = ""
       
        for (let cname in creeps) {
            let creep: Creep = Game.creeps[cname]
            if (!creep) {
                delete creeps[cname]
                delete this.roomdatas.creeps[this.classname][cname]
                this.AddLog("_getcreept delete :" + cname
                    , 30, creeps)
                continue
            }
            let lvst = creep.memory["lv" + st]
            if (!creep.memory["rolekey"] || creep.memory["rolekey"] == "backpower" || !lvst) {
                lvst = -1
            }
            this.AddLog("  addplan  check douser creep lv:" + st + lv + " " + lvst + " " + creep.name
                , 27, creep.pos)
            if (lv <= lvst) continue;//目标在搞更高级的
            //只有本房间才判断最近的
            if (roomname != creep.room.name) {
                findcreep = creep.name
                this.addlog("ship78addplan", " _getcreept not in room:" + lockroom + " " + findcreep, 20
                    , role, roletargetid, findcreep)
                break;
            }  
            //if (!this.iscanref(rolekey)) {
            //    if (!findcreepold)
            //        findcreep = creep.name
            //    break;
            //}  
            //如果在20格之内就不需要判断这些
            if (creepold) {
                if (creepold.pos.getRangeTo(roletarget) <= 20) { 
                    this.addlog("ship78addplan", " _getcreept <=20:" + lockroom + " " + findcreep
                        , 27, role, roletargetid, findcreep, rolekey)
                    return findcreepold
                }
                  
            }
            //满的判断T 空的判断S
            if (creep.store.getUsedCapacity() == 0 && source) {
                nearnow = creep.pos.getRangeTo(source)
            }else
                nearnow = creep.pos.getRangeTo(roletarget)
            
      
            if (nearnow < nearmax) { 
                nearmax = nearnow 
                findcreep = creep.name
                this.addlog("ship78addplan", " _getcreept nearnow < nearmax:"
                    + lockroom + " " + findcreep, 20
                    , creep.pos, roletargetid, findcreep)
            } 
        }
        return findcreep
        // 
    }

    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _getcreep(lockroom, role, st) {
        let ckind = this.botkind
        let lv = role["lv"]
        //let id = role["id"]

        //let roletarget: any = this.getObjectById(id)
        //if (!roletarget) {
        //    this.AddLog("  _addplan  check douser1111  targeterr :" + id
        //        , 40, roletarget)
        //    return "";
        //}
        let roomname = role["roomname"]
        let enkind = role["enkind"]
        let roletargetid = role["roletargetid"]
        let findcreep
        let roomdata = this.roomdatas.getRoomdata(lockroom)
        if (!roomdata) return;
        let creeps = roomdata.getlocalcreeps( ckind)
        //let room78: BaseRoom = this.room78s[lockroom]
        //let creeps
        //if (room78)
        //    creeps = room78.getCreepsckind(ckind)
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 26, creeps)
        if (!creeps) return ""
        let nearmax = 999;
        let nearnow
        for (let cname in creeps) {
            let creep: Creep = Game.creeps[cname]
            if (!creep) {
                delete creeps[cname]
                delete this.roomdatas.creeps[this.classname][cname]
                continue
            }
            let lvst = creep.memory["lv" + st]
            if (!creep.memory["rolekey"] || creep.memory["rolekey"] == "backpower" || !lvst) {
                lvst = -1
            }
            this.AddLog("  addplan  check douser creep lv:" + st + lv + " " + lvst +" "+ creep.name
                , 26, creep.memory)
            if ( lv <= lvst) continue;
            //分S时 必须t为同房间或者t为-1
            if (st == "s") {
                let targetid = creep.memory["targetid"]
                if (targetid) {
                    let lvt = creep.memory["lvt"]
                    if (!lvt) lvt = -1
                    let tmptarget: any = this.getObjectById(targetid)
                    this.AddLog("  addplan  check douser creep lvt:" + lvt + " " + targetid + " trueflase :"
                        + (lvt && lvt > 0 && tmptarget && tmptarget.room.name != roomname)
                        , 26, tmptarget)
                    if (lvt && lvt > 0 && creep.memory["enkindt"] == "spawn")
                        continue;
                    if (lvt && lvt > 0
                        && tmptarget && tmptarget.room.name != roomname)
                        continue;
                }
            }
            this.AddLog("  addplan  check roletarget.room.name == creep.room.name:" + roomname
                + " " + creep.room.name
                , 10)
            //只有本房间才判断最近的
            if (roomname == creep.room.name) {
                //nearnow = creep.pos.getRangeTo(roletarget)
                //this.AddLog("  addplan  check douser creep nearnow:" + nearnow
                //    + " " + nearmax
                //    , 10, creep.pos)
                //if (nearnow < nearmax) {
                //    nearmax = nearnow
                findcreep = creep.name
                //}
                this.addlog("ship78addplan", " _getcreep findcreep:" + findcreep, 20
                    , creep, findcreep, roletargetid)
                break;
            }
            else {
                findcreep = creep.name
                this.addlog("ship78addplan", " _getcreep findcreep2:" + findcreep, 20
                    , creep, findcreep, roletargetid)
                break;
            }

        }
        return findcreep
    }

    /**
     * 清理douser 计数本房间本任务的爬 顺便存下其它房间的爬 看能否替换
     * */
    _addplanCheckdouser(role, st, enkind, neednum, sourceid)   {
        let repcreep;//有不在这个房间的 可以用这个房间的来替换
        let refnear = 0;//997隔壁  998 隔壁隔壁
        let localcreep = 0;//在本房间的 又在搞这个任务的计数 隔壁的都不算个数 可以替换
        let roomname = role["roomname"]
        let roletargetid = role["roletargetid"]
        let rolekey = role["rolekey"]
        //有可能没跑这个了
        //也有可能在跑的没在这个房间
        //看看有没有本房间的
        //清理dousers 找出一个可以替换的爬
        for (let douser in role["dousers"]) {
            let douseritem = role["dousers"][douser]
           
            let creeptmp: Creep = Game.creeps[douser]
            if (!creeptmp) {
                delete role["dousers"][douser]
                this.addlog("ship78addplan", " delete douser:" + douser, 20, role, rolekey
                    , roletargetid, douser)
                continue;
            }
            this.AddLog("_addplanCheckdouser test:" + creeptmp.memory["rolekey"] 
                , 26, creeptmp)
            if (creeptmp && !creeptmp.memory["rolekey"]) {
                delete role["dousers"][douser]
                this.addlog("ship78addplan", " delete douser rolekey empty:" + douser
                    , 20, role, rolekey, roletargetid, douser)
                this.AddLog("_addplanCheckdouser test del:" + creeptmp.memory["rolekey"]
                    , 26, role["dousers"])
                continue;
            }
            repcreep=douser
            if (st == "t") {
                if (enkind != "spawn") {
                    if (creeptmp.memory["targetid"] != roletargetid) {
                        delete role["dousers"][douser]
                        this.addlog("ship78addplan", " delete douser targetid!=id:" + douser
                            + " " + rolekey + " " + creeptmp.memory["targetid"]
                            , 20, role, rolekey, roletargetid, douser)
                        continue;
                    }
                }
                else {
                    if (creeptmp.memory["enkindt"] != "spawn") {
                        delete role["dousers"][douser]
                        this.addlog("ship78addplan", creeptmp.memory["enkindt"]+ " delete douser enkindt!=spawn:" + douser
                            , 20, role, rolekey, roletargetid, douser)
                        continue;
                    }
                }
            } else {
                if (creeptmp.memory["sourceid"] != roletargetid) {
                    delete role["dousers"][douser]
                    this.addlog("ship78addplan", " delete douser sourceid!=id:" + douser
                        , 20, role, rolekey, roletargetid, douser)
                    continue;
                }
            }
            if (creeptmp.room.name == roomname) {
                localcreep++
                douseritem["near"] = 0//后面可以判断距离
            }
            else {
                //找一个可以替换的爬
                if (douseritem["near"] != 0 || douseritem["near"] > refnear) {
                    refnear = douseritem["near"]
                    repcreep = douser
                }
            }
        }
        //找到的不在这个房间的爬 如果有本房间的可以换
        role["refnear"] = refnear
        role["repcreep"] = repcreep;
        role["localcreep"] = localcreep//本房间搞这个任务的爬个数
        this.addlog("ship78addplan", localcreep + " clear douser over:" +  repcreep
            , 20, role, rolekey, roletargetid)
        return  ;
    }
  
    /**
      * 调度是否需要增加减少爬个数
      * */
    _addplandousernum(role, st, enkind, neednum, sourceid): boolean {
        this.AddLog("  _addplandousernum init:" , 27, role )
        let repcreep;//有不在这个房间的 可以用这个房间的来替换
        let refnear = 0;//997隔壁  996 隔壁隔壁
        let localcreep = 0;//在本房间的 又在搞这个的计数 隔壁的都不算个数 可以替换
        let roomname = role["roomname"]
        let id = role["rolekey"]
        let roletargetid = role["roletargetid"]
        //有可能没跑这个了
        //也有可能在跑的没在这个房间
        //看看有没有本房间的
        //清理dousers 找出一个可以替换的爬
        for (let douser in role["dousers"]) {
            let douseritem = role["dousers"][douser]
            let creeptmp: Creep = Game.creeps[douser]
            if (!creeptmp) {
                delete role["dousers"][douser]
                this.addlog("ship78addplan", " delete douser:" + douser, 20, role, id
                    , roletargetid, douser)
                continue;
            }
            if (st == "t") {
                if (enkind != "spawn") {
                    if (creeptmp.memory["targetid"] != roletargetid) {
                        delete role["dousers"][douser]
                        this.addlog("ship78addplan", " delete douser targetid!=id 2:" + douser, 20, role, id
                            , roletargetid, douser)
                        continue;
                    }                      
                }
                else {
                    if (creeptmp.memory["enkindt"] != "spawn") {
                        delete role["dousers"][douser]
                        this.addlog("ship78addplan", " delete douser enkindt!=spawn 2:" + douser, 20, role, id
                            , roletargetid, douser)
                        continue;
                    }                      
                }
            } else {
                if (creeptmp.memory["sourceid"] != roletargetid) {
                    delete role["dousers"][douser]
                    this.addlog("ship78addplan", " delete douser sourceid!=id 2:" + douser, 20, role, id
                        , roletargetid, douser)
                    continue;
                }                      
            }
            if (creeptmp.room.name == roomname) {
                localcreep++
                douseritem["near"]=0
            }              
            else {
                //找一个可以替换的爬
                if (douseritem["near"] != 0 || douseritem["near"] > refnear) {
                    refnear = douseritem["near"]
                    repcreep = douser
                }
            } 
        }
        //if (!Object.keys(role["dousers"])
        //    || Object.keys(role["dousers"]).length == 0) {

        //}
     
        this.AddLog("  addplan2 checknew ref info:"
            + enkind + (!Object.keys(role["dousers"])), 26, role["dousers"])

        //根据本房间个数和能量总量和机器容量决定是否需要减
        let dousernum = Object.keys(role["dousers"]).length
        this.addlog("ship78addplan", " _addplandousernum:" + dousernum, 10, role, id
            , roletargetid)
        this.AddLog("_addplandousernum test:"
            + (dousernum - 1) + " " + this.shipstore, 25 )
        if ((dousernum - 1) * this.shipstore > neednum) {
            if (repcreep) {
                let creeptmp: Creep = Game.creeps[repcreep]
                this.addlog("ship78addplan", " _addplandousernum 减爬:" + repcreep, 20
                    , creeptmp, repcreep , roletargetid)
                delete role["dousers"][repcreep]
                if (st == "s") {
                    delete creeptmp.memory["sourceid"]
                    delete creeptmp.memory["lvs"]
                    delete creeptmp.memory["enkinds"]
                } else {
                    delete creeptmp.memory["targetid"]
                    delete creeptmp.memory["lvt"]
                    delete creeptmp.memory["enkindt"]
                }
                repcreep = "";
            }
            return
        }

        //容量决定是不是要加
        if (localcreep >= 1 && (localcreep + 1) * this.shipstore > neednum) {
            return
        }
        //10回合计算一次 添加 或更改为本地
        //if (dousernum >= 1 && !this.refnum(this.memoryclass, this.classname)) {
        if (dousernum >= 1 && !this.iscanref(this.classname)) {
            return
        }
        this.AddLog("  addplan2 test  localcreep num:" + localcreep + enkind, 27, role)
        //有些任务不必要支持1个的
        if (localcreep >= 1) {
            switch (enkind) {
                case "terminal"://t
                case "tower"://t
                case "spawn"://t
                case "linkstorage"://t
                case "storecreep"://t
                case "sourcenormal"://s可能是边缘
                    return
            }
            if (sourceid) return
        }
        //找到的不在这个房间的爬
        role["refnear"] = refnear
        role["repcreep"] = repcreep;
        role["localcreep"] = localcreep;
        return true;
    }





}

 
 
 