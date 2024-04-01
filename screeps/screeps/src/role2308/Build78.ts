import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";
import { Store78 } from "./Store78";


/**
 * 

 * */
export class Build78 extends Basic78 {

    //本模块需要的所有前置
    props: any
    roomdatas: RoomData78//房间数据
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型
    ship78: Ship78
    walldefault: number//墙默认
    seting: object//基础设置数据
    wall:object//墙设置
    store78: Store78
    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();

        this.classname = "Build78"
        
        super.init();
        this.logleaveAuto = 40;
        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78
            this.walldefault = props.walldefault
            this.seting = props.seting
            this.store78 = props.store78;
            this.wall = props.wall
        }
        this._init();

    }



    _init() {
        
        if (!this.memoryclass["plans"]) this.memoryclass["plans"] = {}
       
    }

    Run() {
       
        let plans = this.memoryclass["plans"]
        //每个房间一个就好 修 造 最后没事干了就去补墙
      
       
        this.AddLog("runinit:", 15);
        this._autoPlan()//计算  一个房间一个计划      
        this.addlog("Run","plans:", 15, plans);
        this._create();//是否安排生产
    }

    CreepRun(creep: Creep) {
        this.reflocal(creep)
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.getMemoryclass()["plans"]
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
        let roomname = rolekey
        let roomdata = this.roomdatas.getRoomdata(roomname)
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
        this.AddLog("  creeprun init :", 10);
        if (creep.spawning) return;

        if (!rolekey) {
            //如果有任务 重新安排任务
            //if (plans[roomname])
            //    creep.memory["rolekey"] = plans[roomname]["rolekey"]
            //else {
            //    //没有 安排一个刷墙
            //    rolekey = roomname + "_wait"
            //}
            //this.AddLog("  creeprun rolekey empty :", 10, plans);
            return;
        }

        let role = plans[roomname]
        if (!role) {
            delete creep.memory["rolekey"]
            this.addlog("CreepRun", "  creeprun role not fould   :"   + rolekey, 40, plans);
            //return;
        }
        if (!role["douser"]) {
           
            delete creep.memory["rolekey"]
            this.addlog("CreepRun", role["douser"]+ " role douser empty   " + roomname +" " + creep.name
                , 40, role, creep.name, roomname + this.classname)   
            return;
        }
            
        if (role["douser"] != creep.name) {
            this.addlog("CreepRun", roomname + "  douser != creep.name delrolekey "
                + role["douser"] + " " + creep.name + " " + creep.memory["rolekey"]
                , 40, null, creep.name, roomname + this.classname)  
            delete creep.memory["rolekey"]
         
            return 
        }
        //先把仓库的信息刷新
        let sourceid = creep.memory["sourceid"]
        let storecreep: Creep = Game.creeps[sourceid]
        this.AddLog("  creeprun in  test storecreep :" + roomname + sourceid + " " + creep.name
            , 10, storecreep);
        if (storecreep) {
            //有可能会抢 还是它自己决定好一点
    
            let storesourceid = storecreep.memory["sourceid"]
            let storesource = Game.creeps[storesourceid]
            this.AddLog("  creeprun in  test storecreep :" + roomname +
                storesourceid + " " + creep.name
                , 10, storecreep);
            if (storesource) {//如果有 又不是我就删除了 
                if (storesourceid != creep.name) {
                    delete creep.memory["sourceid"]
                    storesource = null
                }
            }
            else {
               
                let creeplock = storecreep.memory["lockcreep"]
                if (creeplock) {
                    if (!Game.creeps[creeplock]) {
                        storecreep.memory["lockcreep"] = creep.name

                    }
                } else
                    storecreep.memory["lockcreep"] = creep.name
                if (!creep.pos.inRangeTo(storecreep.pos, 3)) {
                    this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy")
                    this.AddLog(" fill store22   :", 20, this.ship78.memoryclass[roomname]["t"]);
                }
            }
        }

        let targetid = creep.memory["targetid"]
        if (!targetid) {
            if (role && role["targetid"]) {
                creep.memory["targetid"] = role["targetid"]
            }
            else {//没有 安排下个任务或一个刷墙
                this._CreeprunGetNextTarget(creep)
                creep.memory["rolestep"] = "move"
            }
            targetid = creep.memory["targetid"];
        }
        let target: any = this.getObjectById(targetid)
        this.AddLog("  creeprun check target :" + " " + targetid, 10);
        if (!target) {
            if (creep.room.name != roomname) {
                
                if (!roomdata) return;
                this.addlog("_CreeprunGetNextTarget", "  creeprun move roomname  :"
                    + roomname + " " + targetid, 10, roomdata, creep.name, roomname);

                creep.moveTo(roomdata.room.controller)
                return
            }
            this.addlog("creeprun", "targetid empty", 10, creep.pos
                , creep.name, roomname + this.classname);
            this._CreeprunGetNextTarget(creep)
            if (!creep.memory["targetid"]) {
                delete creep.memory["rolekey"]
                this.addlog("creeprun", "targetid empty over", 10, creep.pos
                    , creep.name, roomname + this.classname);
            }
            return;
        }

        let rolestep = creep.memory["rolestep"]
        if (!rolestep) rolestep = "move"
        if (!creep.pos.inRangeTo(target, 3)) {
            rolestep = "move"
            creep.memory["rolestep"] = "move"
            //return;
        }
    
      

        
        if (!storecreep) {
            //要求补
            if (creep.store.getUsedCapacity() < creep.store.getFreeCapacity()) {
                this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy")
                this.AddLog(" fill store   :", 20, this.ship78.memoryclass[roomname]["t"]);
            }
            sourceid = this.store78.addplan(creep.name, roomname
                , this.classname, 60)
            creep.memory["sourceid"] = sourceid
        }
        else {
            delete this.ship78.memoryclass[roomname]["t"][creep.id+"Ship78"]
        }

        if (rolestep == "move") {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                if (storecreep
                    && storecreep.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                    creep.transfer(storecreep, RESOURCE_ENERGY)
                }
                else {
                    creep.drop(RESOURCE_ENERGY)
                }
                //return;
            }
            let tmp = creep.moveTo(target)
            if (creep.pos.inRangeTo(target, 3)) {
                creep.memory["rolestep"] = "working"
                return;
            }

            return;
        }
        //if (!creep.pos.inRangeTo(target, 3)) {
        //    creep.memory["rolestep"] = "move"
        //    return;
        //}

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            if (storecreep && storecreep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                storecreep.transfer(creep, RESOURCE_ENERGY)
            }
            return;
        }
         

        if (target["structureType"] == "road") {
            if (storecreep && storecreep.fatigue == 0
                && creep.pos.isNearTo(storecreep)
                && !creep.pos.isEqualTo(target))
                creep.moveTo(target)

        }
        if (!target["hits"]) {
            let tmp = creep.build(target);
            if (target["structureType"] == "rampart")
                creep.memory["roletype"] = "rampart"
            else
                creep.memory["roletype"] = "build"
            if (tmp == -9)
                creep.memory["rolestep"] = "move"
            this.AddLog("CreepRepair  build:" + tmp + " " + creep.id, 10, target);
            return;
        }

        if (target["hits"] >= target["hitsMax"]) {
            delete creep.memory["targetid"]
            delete plans[roomname][targetid]
            this.AddLog("CreepRepair  over:" + creep.id, 0);
            return;
        }

        if (target["structureType"] == "rampart"
            || target["structureType"] == "constructedWall") {
            let setmaxhits = this.wall[roomname] || this.walldefault
            this.AddLog("CreepRepair  repair :" + target["hits"] + " " + setmaxhits, 10);
            if (target["hits"] >= setmaxhits) {
                delete creep.memory["targetid"]
                delete plans[roomname][targetid]
                this.AddLog("CreepRepair rampart  over:" + target["structureType"] + creep.id + JSON.stringify(creep), 10);
                return;
            }
        }

        if (target["hits"] < target["hitsMax"]) {
            let tmp = creep.repair(target)
            this.AddLog("repair doing:" + tmp + target["hits"] + " " + target["hitsMax"]
                , 0);
            return;
        }

    }

    /**
     * 安排下个任务或一个刷墙
     * */
    _CreeprunGetNextTarget(creep: Creep) {
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"]
        let roomname = creep.memory["roleroom"]
        let targetid = ""
        let roomdata = this.roomdatas.getRoomdata(roomname)
  
        let roletype = creep.memory["roletype"]
        delete creep.memory["targetid"]
        this.addlog("_CreeprunGetNextTarget",
            "  creeprun check roletype :" + roletype + " " + targetid, 10, roomdata, creep.name, roomname);
        if (roletype == "rampart") {//这个必须要用find 找出最小的那个
            //找周边的rampart 这里没法用缓存
            let raps = creep.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } })
            // creep.room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } })
            for (var key in raps) {

                if (raps[key] && raps[key]["hits"] <= 9999) {
                    creep.memory["targetid"] = raps[key].id;
                    this.AddLog("CreepRepair  find  rampart fix it:", 50, raps[key]);
                    return;
                }
                this.AddLog("CreepRepair  find  rampart:", 10, raps[key]);
            }
            delete creep.memory["roletype"]
            return;
        }

        //先把优先级>=20的处理完 然后才找近的
        let lv20over = creep.memory["lv20over" + roomname]
        if (!lv20over) {
            let lv = -1
            let nearmax = 999
            //找lv最高的
            let roles = plans[roomname]
            for (let id in roles) {
                let newid: any = id
                let role = roles[id]
                let newobj: any = this.getObjectById(newid)
                if (!newobj) {
                    delete roles[id]
                    continue
                }
                //if (!newobj.my) continue
                let nowlv = role["lv"]

                let nearnow = creep.pos.getRangeTo(newobj)
                if (nowlv <= 20) continue
                if (nearnow > 3 && newobj.hits && newobj.hits >= newobj.hitsMax * 0.9) continue;
                this.addlog("_CreeprunGetNextTarget", "CreepRepair  lv >20 test:" + nowlv + " " + lv
                    + " nearnow:" + nearnow + " " + nearmax, 10
                    , newobj.pos, creep.name, roomname);
                if (nowlv > lv) {

                    targetid = id;
                    lv = nowlv
                    nearmax = nearnow
                    this.addlog("_CreeprunGetNextTarget", "CreepRepair  lv >20:", 10, newobj.pos, creep.name, roomname);
                } else if (nowlv == lv) {

                    if (nearnow < nearmax) {
                        nearmax = nearnow
                        targetid = id;

                        this.addlog("_CreeprunGetNextTarget", "CreepRepair change  lv >20:", 10, newobj.pos, creep.name, roomname);
                    }
                }
            }
            this.addlog("_CreeprunGetNextTarget", "  creeprun check find lv20 over :" + roletype + " " + targetid, 10, null,  creep.name, roomname);
            if (targetid) {
                creep.memory["targetid"] = targetid
            }
            else {
                creep.memory["lv20over" + roomname] = true
            }
            return;
        }

        //现在就是找最近的了
        let nearmax = 999

        let roles = plans[roomname]
        this.addlog("_CreeprunGetNextTarget"
            , "CreepRepair change  lv findnear test  roles:", 10, roles, creep.name, roomname);
        for (let id in roles) {
            let newid: any = id

            let newobj: any = this.getObjectById(newid)
            if (!newobj) {
                delete roles[id]
                continue;
            }
            //if (!newobj.my) continue
            if (newobj["structureType"] == "rampart"
                || newobj["structureType"] == "constructedWall") {
                let setmaxhits = this.wall[roomname] || this.walldefault
                if (newobj.hits >= setmaxhits) continue;
            }
            let nearnow = creep.pos.getRangeTo(newobj)
            this.AddLog("CreepRepair change  lv findnear test :" + nearnow
                + " " + newobj.hits + " " + newobj.hitsMax * 0.7
                + newobj["structureType"], 10, newobj.pos);
            if (newobj.hits && newobj.hits >= newobj.hitsMax * 0.9) continue;
            if (!targetid) {
                targetid = newid;
                //target = newobj
            }

            if (nearnow > 3 && newobj.hits && newobj.hits >= newobj.hitsMax * 0.7) continue;
            //路只修周边三格的
            if (nearnow > 3 && newobj["structureType"] == "road"
                && newobj.hits >= newobj.hitsMax * 0.7) continue;

            if (nearnow < nearmax) {
                nearmax = nearnow
                targetid = id;
                //target = newobj
                creep.memory["targetid"] = targetid
                this.AddLog("CreepRepair change  lv findnear:" + nearnow, 10, newobj.pos);
                if (nearmax <= 3) break;

            }

        }

        if (!targetid) {
            let nextname;
            let roomnext = this.roomdatas.getNextRooms(roomname)
            for (var i = 0; i < roomnext.length; i++) {
                nextname = roomnext[i]
                let nextroles = plans[nextname]
                if (nextroles && Object.keys(nextroles).length >= 1) {
                    creep.memory["roleroom"] = nextname

                    this.AddLog("CreepRepair  over changeroomnext  " + roomname + nextname, 20, nextroles);
                    return
                }
            }
            this.AddLog("CreepRepair  over changeroomnext  " + roomname + nextname, 20, creep.pos);
            return
        }

    }

    _create() {
        let creeps = this.roomdatas.creeps[this.classname];
     
        let plans = this.getMemoryclass()["plans"]
        for (let roomname in plans) {
            if (!this.iscanref(roomname)) {
                continue;
            }
        
            let plan = plans[roomname]
            let rolekey = roomname 
            let douser = plan["douser"]
            this.addlog("_create", plan["toplv"]+ " start " + roomname + douser
                , 10, plan, roomname, roomname + this.classname)   
            if (!Game.rooms[roomname]) {
                delete plans[roomname]
                continue;
            }
            if (douser) {
    
                let creepdouser = Game.creeps[douser]
                if (creepdouser) {
                    if (creepdouser.memory["rolekey"] == rolekey) continue;
                    if (!creepdouser.memory["rolekey"]) {
                        this.addlog("_create",roomname+ " douser check rolekey !=creepmemory set rolekey" + rolekey
                            + " " + creepdouser.memory["rolekey"] + " " + plan["douser"]
                            , 40, plan, roomname, douser, roomname + this.classname)   
                        creepdouser.memory["rolekey"] = roomname
                        creepdouser.memory["roleroom"] = roomname
                        continue;
                    }
                 
                    this.addlog("_create", " douser check rolekey !=creepmemory " + rolekey
                        + " " + creepdouser.memory["rolekey"] + " " + plan["douser"]
                        , 40, null, douser, roomname + this.classname)   
                    delete plan["douser"]
                    continue;
                }   
                    
                this.addlog("_create delete douser", " douser check del " + rolekey
                     +" "+ plan["douser"]
                    , 40, null, douser, roomname + this.classname)   
                delete plan["douser"]
                //delete Game.creeps[douser].memory["rolekey"]
           
                continue;
            }
            if (!plan["toplv"]|| plan["toplv"] <20) continue; 
            this.addlog("_create", roomname+ " toplv check " + plan["toplv"]
                , 10, null, roomname + this.classname, roomname)   
            //看本房间或隔壁房间有没有
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreepByRoomname(roomname)
            this.addlog("_create", plan["toplv"] + roomname + plan["douser"] + " findcreep1    "   + findcreep
                , 10, roomname + this.classname, findcreep)   
            let nexts = this.getNextRooms(roomname)
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreepByRoomname(nexts[i])
                    if (findcreep) {
                        break;
                    }
                }
            }
            this.addlog("_create", roomname + plan["douser"] + " findcreep next    " + findcreep
                
                , 10, roomname + this.classname, findcreep)   
         
            if (findcreep) {
                plan["douser"] = findcreep
                let creepok = Game.creeps[findcreep]
                creepok.memory["rolekey"] = roomname
                creepok.memory["roleroom"] = roomname
                delete creepok.memory["targetid"]
                this.addlog("_create", roomname + plan["douser"] + " findcreepok    " + findcreep
                   
                    , 40,null, roomname+this.classname,findcreep)   
                continue
            }

            this.addlog("_create", (Game.creeps[douser]) + " douser check " + roomname + douser
                , 10,null, roomname + this.classname, findcreep)   
            //continue

            //搞多了资源供不上
            if (creeps && Object.keys(creeps).length >= 5) {
                if (!this.seting["rooms"][roomname]  ) { 
                    continue;
                }
            }
          
         
            let mem = {
                memory: {
                    rolekind: this.classname
                    , roleroom: roomname
                    , rolekey: rolekey//唯一标记 
                    , ckind: this.botkind//有可能一种机型不同的任务的
                    , targetid: plans[roomname]["topid"]
                    
                }
            }
            this.AddLog("_runWorknum create:" + rolekey, 10, mem);
            //找到一个没有安排的位置 安排生产
            let createlvtmp = this.createlv
            if (this.seting["outoce"][roomname]) createlvtmp = createlvtmp - 30;
            this.spawn78.addplan(rolekey+this.classname, createlvtmp, mem, this.addcallback)
        }
    }

    /**
   * 直接按本地位置来找
   * @param findroom
   */
    _getcreepByRoomname(lockroom) {
        let ckind = this.botkind  
        let roomdata = this.roomdatas.getRoomdata(lockroom)
        if (!roomdata) return "";
        if (!roomdata.globalclass["local"]) roomdata.globalclass["local"] = {}
        let creeps = roomdata.globalclass["local"][ckind]
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 10, creeps)
        if (!creeps) return  null
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


    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"]
        let role = Memory["rolelist78"]["Build78"]["plans"][rolekey]
        console.log("addcallback "+rolekey +" "+ JSON.stringify(role));
        if (!role) return 
        role["douser"] = creepname  
    }

    /**
     * 返回False不用修 删除掉
     * */
    _autoPlan_going(structtmp,roomname): boolean {
        let thistoplv;
        let hitsnow = 0;
        let id;
        let plans = this.getMemoryclass()["plans"]
        let roomrole = plans[roomname]
        if (!structtmp) {
            return false;
        }

        let roomdata = this.roomdatas.getRoomdata(roomname); 
        let structureType = structtmp.structureType;
        id = structtmp.id
        let hismax
        let toplv = -1;
        let topid: any = "";
        switch (structureType) {
            case "rampart":
            case "constructedWall":
                if (!roomdata.spawnname) return false; 
                if (structtmp.pos.x == 0 || structtmp.pos.y == 0
                    || structtmp.pos.x == 49 || structtmp.pos.y == 49) return false; 
                hismax = this.wall[roomname] || this.walldefault
                if (structtmp.hits > hismax * 0.7) return false; 

                thistoplv = 10;
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    topid = structtmp.id;
                }
                //if (toplv == thistoplv && structtmp.hits > hitsnow) continue;

                this.AddLog("  _autopalan     :" + roomname + roomdata.spawnname, 0, structtmp.pos);
                break;
            case "storage":
            case "tower":
            case "container":
            case "link":
            case "extension":
            case "spawn":
            case "extractor":
            case "lab":
            case "terminal":
                if (structtmp.hits == structtmp.hitsMax) return false; 
                if (structtmp.hits >= structtmp.hitsMax * 0.9) return false; 
                if (structtmp.hits <= structtmp.hitsMax * 0.3)
                    thistoplv = 70;
                else
                    thistoplv = 10
                hismax = structtmp.hitsMax
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    topid = structtmp.id;
                }
                this.AddLog("  _autopalan     :" + roomname
                    , 0, structtmp);
                break;
            case "road":
                hismax = structtmp.hitsMax
                //if (structtmp.hits == structtmp.hitsMax) continue;
                if (structtmp.hits >= structtmp.hitsMax * 0.9) return false; 
                //有>=20的就起动 检查的时候>20的才单独 就正好
                if (structtmp.hits <= structtmp.hitsMax * 0.6)
                    thistoplv = 20;
                else
                    thistoplv = 10
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    topid = structtmp.id;
                }
                this.AddLog("  _autopalan     :" + roomname
                    , 0, structtmp);

                break;
            case "invaderCore":
            case "controller":
            case "keeperLair":

                return false; 

            default:
                this.AddLog("repair find other kind :" + structureType, 40, structtmp);
                return false; 
        }
        if (!roomrole[id]) {
            roomrole[id] = {
                id: id, kind: "repair"
                , resourceType: structureType
                , hits: structtmp.hits
                , hitsmax: hismax
                , roomname: roomname
                , lv: thistoplv
                , pos: structtmp.pos
            }
        } else {
            roomrole[id]["hits"] = structtmp.hits
            roomrole[id]["pos"] = structtmp.pos
        }
        return true
    }
    /**
     * 添加任务
     * */
    _autoPlan() {
        
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.getMemoryclass()["plans"]

        for (let roomname in Game.rooms) { 
            let room = Game.rooms[roomname] 
            if (!room) continue;
            if (room.controller && room.controller.owner && !room.controller.my ) {
                delete plans[roomname];
                continue;
            }
           
            if (!this.iscanref(roomname)) {
                continue;
            } 
            if (!plans[roomname]) plans[roomname] = {}
            let roomdata = this.roomdatas.getRoomdata(roomname); 
            let structures = roomdata.globalclass.structures
            let roomrole = plans[roomname]
         
  
          
              //看要不要修
            if (structures) {
                for (var i = 0; i < structures.length; i++) {
                    let structtmp = structures[i]
                    let isneed = this._autoPlan_going(structtmp,roomname)
                    if (!isneed)
                        delete roomrole[ structtmp.id]
                }

            }

            let toplv = roomrole["toplv"]
            let topid = roomrole["topid"]
            if(!toplv)toplv=-1
            //工地建筑
            let length = roomdata.globalclass.constructionsites.length;  
            for (var i = 0; i < length; i++) {
                let construct = roomdata.globalclass.constructionsites[i]
                let structureType = construct["structureType"]
                if (!construct.my) continue


                this.AddLog("build find :" + structureType, 0, construct);
                let id = construct.id
                let thistoplv = -1;
                switch (structureType) {
                    case "storage":
                    case "spawn":
                    case "container":
                        thistoplv = 70;
                        break;
                    case "tower":
                        thistoplv = 60;
                        break;
                    case "extension":
                        thistoplv = 50;
                        break;
                    case "road":
                        thistoplv = 20;
                        break;
                    case "rampart":
                        thistoplv = 20;
                        break;
                    default:
                        thistoplv = 20;
                        break;
                }
                if (toplv < thistoplv) {
                    toplv = thistoplv;
                    topid = construct.id;
                }
                if (!roomrole[id]) {
                    roomrole[id] = {
                        id: id, kind: "build"
                        , resourceType: structureType
                        , hits: 0
                        , hitsmax: 3000
                        , roomname: roomname
                        , lv: thistoplv
                    }
                }
            }
            plans[roomname ][ "toplv"] = toplv
            plans[roomname ][ "topid"] = topid

            this.addlog("_autoPlan", plans[roomname]["toplv"] + " over " + roomname +
                plans[roomname]["douser"]
                , 10, plans[roomname], roomname, roomname + this.classname)   
        }
    }
}
     
  
   
     
  
 




 
 
 