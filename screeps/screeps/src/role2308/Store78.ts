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
export class Store78 extends Basic78 {

    //本模块需要的所有前置
    props: any
    roomdatas: RoomData78//房间数据
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型
    ship78: Ship78

    //------------------以下自动管理
    plans: any;//待建造计划
    creeps: any;//本类所有爬
    //----------------------------
    constructor(props) {
        super();

        this.classname = "Store78"
        this.logleaveAuto = 40;
        super.init();

        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
            this.ship78 = props.ship78

        }
        this._init();

    }



    _init() {
        this.creeps = this.roomdatas.creeps[this.classname];
        if (!this.globalclass["plans"]) this.globalclass["plans"] = {}
        this.plans = this.globalclass["plans"]
    }

    //run() {
    //    //每个房间一个就好 修 造 最后没事干了就去补墙
    //    this.setDebug();
    //    this.AddLog("runinit:", 15);

    //}

    /**
    * 可以搞别的事儿 但是不能离开房间 除非lockcreep挂了就解放了
    * @param lookcreep
    * @param lockroom
    * @param lockrolekind
    */
    addplan(lockcreepname, lockroom, lockrolekind, locklv) {
        /**修理先请求一个Store 返回空闲store名字
        * 或者生产 (生产为了不同防冲突就targetid + "store"???)
       //找到了Store才生产修理机 生产时把store名字带过去了 sourceid

       //store逻辑:
       .如果lookcreep没有 或没生产出来 
       .有rokekey先搞其它的不影响 以后MOVE也可以这样
       。如果没有rolekey 先走到lockroom 等lookcreep出来 就可以变过来了
       */
        let creeprole = {
            "ckind": this.botkind
            , rolekind: this.classname
            , "locklv": locklv
            , lockroom: lockroom
            , roleroom: lockroom
            , lockrolekind: lockrolekind
            , lockcreep: lockcreepname
            //, rolekey: targetid + "store"
            // 新建的 名字还是要搞个好找的 前面的名字是根据目标来的 加个store
        }
        //爬自己去判断如果lockc生产出来有了 就删除改到sid 然后再挂了就清了
        this.AddLog("    addplan:" + this.logleave + lockroom + lockcreepname
            , 10, creeprole)
        let findcreep = this._addplanfindcreep(lockroom, lockcreepname)

        if (findcreep) {//清除并更换lockinfo
            let creep: Creep = Game.creeps[findcreep]
            delete creep.memory["lockcreep"]
            for (let item in creeprole) {
                creep.memory[item] = creeprole[item]
            }
            return findcreep;
        }

        creeprole["rolekey"] = lockcreepname + "store"
        let mem = {
            memory: creeprole

        }


        //找到一个没有安排的位置 安排生产
        this.spawn78.addplan(creeprole["rolekey"], this.createlv, mem,this.addcallback)
        this.AddLog("create creep addplan:" + creeprole["rolekey"], 15, this.spawn78.createlist);
        return creeprole["rolekey"]
    }

    addcallback(rolekey, creepname, createrole) {
        let lockcreep = createrole["lockcreep"]
        if (Game.creeps[lockcreep])
            Game.creeps[creepname].memory["sourceid"] = lockcreep
        //let role = Memory["rolelist78"]["Store78"]["plans"][rolekey]
        //if (!role) return
        //role["douser"] = creepname
    }

    /**
     * 在房间或隔壁二层找
     * */
    _addplanfindcreep(lockroom, lockcreepname) {
        let findcreep;
        //先看本房间有没有即可 再看roomname同的 再看隔壁的  后面再检查任务等级比当前低的
        findcreep = this._addplanFindCreepRoom(lockroom, lockcreepname)
        let nexts = this.getNextRooms(lockroom)
        if (!nexts) return;
        if (!findcreep) {

            for (var i = 0; i < nexts.length; i++) {
                findcreep = this._addplanFindCreepRoom(nexts[i], lockcreepname)
                if (findcreep) break;
            }
        }

        if (!findcreep) {
            //再隔壁的隔壁
            for (var i = 0; i < nexts.length; i++) {
                let nexts2 = this.getNextRooms(nexts[i])
                for (var j = 0; j < nexts2.length; j++) {
                    findcreep = this._addplanFindCreepRoom(nexts2[j], lockcreepname)
                    if (findcreep) break;
                }
            }
        }
        return findcreep;
    }

    /**
     * 直接按本地位置来找
     * @param findroom
     */
    _addplanFindCreepRoom(lockroom, lockcreepname) {
        let lockcreep = Game.creeps[lockcreepname]
        let findcreep
        let room78 = this.roomdatas.getRoomdata(lockroom)
        let creeps
        if (room78)
            creeps = room78.getlocalcreeps(this.botkind)// global.mine9[lockroom][ckind]
        this.AddLog("  _addplan:"
            + lockroom + " " + lockcreepname
            + " " + this.botkind
            , 10, creeps)
        if (!creeps) return;

        for (let cname in creeps) {
            let creep: Creep = Game.creeps[cname]
            if (!creep) {
                delete creeps[cname]
                continue
            }

            let storesourceid = creep.memory["sourceid"]
            this.AddLog("  createreqlist  test:"
                + lockroom + lockcreepname
                + (!Game.creeps[storesourceid])
                + (lockcreep) + (!Game.creeps[creep.memory["lockcreep"]])
                , 10, creep)
            //如果有任务在搞了 就继续干 大不了重新生产一个
            if (Game.creeps[storesourceid]) continue;

            //如果没有任务 当前请求的机器人 已经生产出来了 先用了 
            if (lockcreep) {
                findcreep = cname
                break;
            }
            //这里是当前请求的爬还没生产出来

            // if (!storecreep.memory["sourceid"]) {
            //如果这个任务要服务的没生产出来 先用
            let creeplock = creep.memory["lockcreep"]
            if (!Game.creeps[creeplock]) {
                findcreep = cname
                break;
            }

            if (creeplock == lockcreepname) {
                findcreep = cname
                break;
            }


        }

        return findcreep
    }

    CreepRun(creep: Creep) {
        this.reflocal(creep)
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
         
        let creepid = creep.memory["sourceid"]
        if (!creepid) {
            creepid = creep.memory["lockcreep"]
            if (Game.creeps[creepid])
                creep.memory["sourceid"]=creepid
        }
        let rolestep = creep.memory["rolestep"]
        let targetcreep = Game.creeps[creepid]
        //let rolekindtarget = role["rolekindtarget"]//目标类别


        if (!targetcreep) {//|| !rolelist[rolekindtarget][rolekey]
            delete creep.memory["rolekey"]
            delete creep.memory["sourceid"]
            //delete rolelist[this.rolekind][rolekey]
            this.AddLog("CreepStore  target out  over:" + creep.id, 0, creep);
            return;
        }
        this.AddLog("  CreepStore   :" + + rolestep + targetcreep.memory["rolekind"]
            + " " + creep.memory["rolekey"], 20, targetcreep);

        //有可能它的仓库不是我
        if (targetcreep) {
            let targetsource = targetcreep.memory["sourceid"]
            if (targetsource != creep.name) {
                delete creep.memory["rolekey"]
                delete creep.memory["sourceid"]
                if (creep.memory["lockcreep"] == creepid)
                    delete creep.memory["lockcreep"]
                this.AddLog("  creeprun clear rolekey   err targetcreep .memory[sourceid]:"
                    + this.logleave + rolekey, 40, creep.pos);
                return;
            }
            if (!rolekey) {
                creep.memory["rolekey"] = creepid
            }
                
        }
        if (!rolekey) {
            return;
        }

        let targetid = creep.memory["targetid"]
        if (targetcreep
            && targetcreep.memory["targetid"] != targetid) {
            creep.memory["targetid"] = targetcreep.memory["targetid"]
            targetid = targetcreep.memory["targetid"]
        }

        //如果目标没出生 就先走到目标地点附近十步内
        let target: any = this.getObjectById(targetid)
        if (!targetcreep) {
            if (!target) {
                this.AddLog("  creeprun not exitst  targetcreep and  target :"
                    + targetid, 40, targetcreep);
                delete creep.memory["sourceid"]
                delete creep.memory["targetid"]

                return;
            }
            if (target.room.name != creep.room.name
                || !creep.pos.inRangeTo(target.pos, 10)) {
                creep.moveTo( target)
                this.AddLog("  creeprun not exitst move to target :" + targetid, 0, target.pos);
                return;
            }
            return
        } 

        //如果出生了 目标没在工作中 离它5步即可
        if (target && targetcreep.room.name != creep.room.name) {
            if (!creep.pos.inRangeTo(target.pos, 5)) {
                creep.moveTo(targetcreep) 
                this.AddLog("  creeprun  exitst move to target :" + targetcreep.name, 10, targetcreep.pos);
                return;
            }

        }

        let targetrolestep = targetcreep.memory["rolestep"]
        if (targetrolestep != "working") {
            if (!creep.pos.inRangeTo(targetcreep, 2)) {
                if (!creep.pos.inRangeTo(targetcreep, 4)) {
                    if (creep.store.getUsedCapacity() >= 50)
                        creep.drop(RESOURCE_ENERGY)
                }
                creep.moveTo(targetcreep)
                return;
            }
            //这里要删除请求库存的信息
            return;
        }

        if (!creep.pos.isNearTo(targetcreep)) {
            if (!creep.pos.inRangeTo(targetcreep, 10)) {
                if (creep.store.getUsedCapacity() >= 50)
                    creep.drop(RESOURCE_ENERGY)
            }
            creep.moveTo(targetcreep)
            return;
        }
        this.moveMapNotOut(creep)
        if (creep.store.getFreeCapacity() >= 200) {
            this.ship78.addplan(creep.id, "t", "storecreep", creep.store.getFreeCapacity(RESOURCE_ENERGY), "energy")
            this.AddLog(" fill store33   :", 10, this.ship78.memoryclass[roomname]["t"]);

            return;
        }


        //if (creep.pos.isNearTo(target)) {
        //    rolestep = "working"
        //} else {
        //    rolestep = "move"
        //}
        //creep.memory["rolestep"] = rolestep;
        //let des = target["pos"];
        //if (rolestep == "move") {
        //    if (!creep.pos.isNearTo(target)) {
        //        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) >= 50) {
        //            creep.drop(RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY) - 50)
        //        }
        //        creep.moveTo(target)
        //        return
        //    }

        //    rolestep = "working"
        //    creep.memory["state"] = "state";
        //}

        //if (state == "working") {

        //if (creep.store.getFreeCapacity() == 0)
        //    return;
    }





}
     
  
   
     
  
 




 
 
 