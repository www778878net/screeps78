
 
/**
 * 通用方法或属性
 * setDebug:弄一个Flag设置为class名 那这个CLASS的这个房间就会是debugroom
 * iscanref:间隔计算
 * _getPosCanMove:这个点是否能移动
 * moveMapNotOut:走到边界防卡 这个按说应该放移动模块去
 * */
export class Basic78 {
    //输入


    //debug
    logleaveAuto: number = 40; 
    logleave: number = 10;//调度时log等级 
    debuglogkey: string = "";
    //这4个好象没用了
    debugrolekey: string = "";
    debugsourceid: string = "";
    debugtargetid: string = "";
    debugcreepname: string = "";
    
 
    //自动控制  
    classname: string
    myownname: string//所有者名字
  
    /**
     * 缓存的数据 默认挂global上 
     */     
    globalclass: any//本类别的存储
    memoryclass: any//本类别需要存在内存的
    defaultset: object//默认设置 (暂时不能自动管理的写死的设置项)

    //每个任务可以设置不同 比如A任务每10TICK算一个ROOM 然后LV为20
    reftotal: number = 10;//如果 tick%reftotal==refcount就计算
    //降级设置 例如战争中 设置20 refleave<20的就不计算了
    refleave: number = 10;//如果 refleave<refleaveTotal不计算
    refleaveTotal: number=10;//默认10 提高就可以降级

    constructor( ) {
        this.reftotal = 10;
        this.logleaveAuto = 40
        
    }


    addlog(key1, info, leave: number = 1, obj: any = null, key2 = "", key3 = "", key4 = "", key5 = "", key6 = "") {
        //console.log(JSON.stringify( global.mine9["log"]["061f6eff-23d1-7cea-83ae-ba6f364cb249"]))
         //console.log(JSON.stringify( global.mine9["log"]["64ec65e930b33668a1016e84"]))
        let self = this;
        info = "~~" + global.tick + this.classname  + "--" + key1 + "--" + info;
        let isdebug = false
        
        if (Game.creeps["debug"]) {
            this.debuglogkey = Game.creeps["debug"].memory["debuglogkey"] 
        }
      
        if (this.debuglogkey) {
            if (key1 && this.debuglogkey.indexOf("~" + key1 + "~") >= 0)
                isdebug = true
            if (key2 && this.debuglogkey.indexOf("~" + key2 + "~") >= 0)
                isdebug = true
            if (key3 && this.debuglogkey.indexOf("~" + key3 + "~") >= 0)
                isdebug = true
            if (key4 && this.debuglogkey.indexOf("~" + key4 + "~") >= 0)
                isdebug = true
            if (key5 && this.debuglogkey.indexOf("~" + key5 + "~") >= 0)
                isdebug = true
            if (key6 && this.debuglogkey.indexOf("~" + key6 + "~") >= 0)
                isdebug = true
            if (this.classname && this.debuglogkey.indexOf("~" + this.classname + "~") >= 0)
                isdebug = true
        }
        if (isdebug || leave >= self.logleave) {
            if (obj) {
                if (typeof obj == "object")
                    obj = JSON.stringify(obj)
                info = info + obj
            }
            console.log(info)
        }
        if (!global.mine9["log"]) global.mine9["log"] = {}
        if (!global.mine9["log"][key1]) global.mine9["log"][key1] = []
        if (key2 && !global.mine9["log"][key2]) global.mine9["log"][key2] = []
        if (key3 && !global.mine9["log"][key3]) global.mine9["log"][key3] = []
        if (key4 && !global.mine9["log"][key4]) global.mine9["log"][key4] = []
        if (key5 && !global.mine9["log"][key5]) global.mine9["log"][key5] = []
        if (key6 && !global.mine9["log"][key6]) global.mine9["log"][key6] = []
        if (this.classname && !global.mine9["log"][this.classname]) global.mine9["log"][this.classname] = []
        global.mine9["log"][key1].push(info)
        if (key2) global.mine9["log"][key2].push(info)
        if (key3) global.mine9["log"][key3].push(info)
        if (key4) global.mine9["log"][key4].push(info)
        if (key5) global.mine9["log"][key5].push(info)
        if (key6) global.mine9["log"][key6].push(info)
        if (this.classname) global.mine9["log"][this.classname].push(info)
    }

   


    getObjectById(id) {
        let backobj = null
        try {
            backobj=Game.getObjectById(id)
        } catch (e) {
            this.AddLog(this.classname+"catch getObjectById  :"+id, 50);
        }
        return backobj
    }
 
    /**
     * 必须调这个
     * this.globalclass 不用内存
     * this.memoryclass 内存中
     * */
    init() {
        this.logleave = this.logleaveAuto;  
        if (this.globalclass ) return;
        this.AddLog("init test: " + this.classname , 10)
        if (!global.mine9[this.classname])global.mine9[this.classname] = {}
        this.globalclass = global.mine9[this.classname]; 
        
        if (this.classname == "roomdata" || !this.classname || this.classname == "RoleCenter") {
            if (!Memory["rolelist78"]) Memory["rolelist78"] = {}
            delete Memory["rolelist78"][this.classname]
            return;
        }
        if (!Memory["rolelist78"]) Memory["rolelist78"] = {}
        if (!Memory["rolelist78"][this.classname]) Memory["rolelist78"][this.classname] = {}
        this.memoryclass = Memory["rolelist78"][this.classname] 
    } 
  
    getGlobalclass() {
        return global.mine9[this.classname]
    }

    getMemoryclass() {
        return Memory["rolelist78"][this.classname] 
    }

    /**
    * 刷新爬的位置local 
    * @param creep
    */
    reflocal(creep: Creep) {
        let roomname = creep.room.name 
        //if (this.debugrolekey && creep.memory["rolekey"] == this.debugrolekey)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugsourceid && creep.memory["sourceid"] == this.debugsourceid)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugtargetid && creep.memory["targetid"] == this.debugtargetid)
        //    creep.memory["isdebug"] = 1;
        //if (this.debugcreepname && creep.name == this.debugcreepname)
        //    creep.memory["isdebug"] = 1;


        let localroom = creep.memory["local"]
        let ckind = creep.memory["ckind"]
        if (!global.mine9[roomname]) global.mine9[roomname] = {}
        if (!global.mine9[roomname]["local"]) global.mine9[roomname]["local"]={ }
        if (!global.mine9[roomname]["local"] [ckind])
            global.mine9[roomname]["local"] [ ckind] = {}
        global.mine9[roomname]["local"][ckind][creep.name] = {
            creepname: creep.name,id:creep.id
        }
        if (localroom != roomname) {
            if (localroom && global.mine9[localroom]["local"] && global.mine9[localroom]["local"][ckind]) {
                delete global.mine9[localroom]["local"][ckind][creep.name]
            }
            creep.memory["local"] = roomname
        }
     
    }
 
    /**
     * 是否允许重新计算 为了同一种任务 不同的房间可以分开计算 然后如果CPU紧张可以不算
     * 常用item=roomname 这样refcount=9 refcount+roomname=1 2 3等
     * */
    iscanref(item): boolean {//
        //this.AddLog("iscanref :" + item + " " + global.tick, 10)   
        // let roomname = room78.roomname
        let refcount = this.globalclass["refcount" + item]
        //如果为空 肯定tick==1 必须计算
        //refcount >= this.reftotal 应该不会到这里 只是防异常
        if (global.tick == 1 || refcount >= this.reftotal
            || global.tick % this.reftotal == refcount) {
            this.AddLog("iscanref ref ok: " + item + " " + refcount
                + " " + this.reftotal, 10)
            if (global.tick == 1 || refcount >= this.reftotal || refcount == undefined) {
                let refBaseRoom = this.globalclass["refcount"]
                if (refBaseRoom == undefined)
                    refBaseRoom = this.reftotal - 1;
                this.globalclass["refcount" + item] = refBaseRoom
                refBaseRoom -= 1
                if (refBaseRoom <= -1)
                    refBaseRoom = this.reftotal - 1;
                this.globalclass["refcount"] = refBaseRoom;
                // this.AddLog("refnum ref ok init :" + globalroom.refnum + " " + global.mine["ref" + kind], 10)   
            }
            return true;
        }
        return false;
    }


 
    /**
    * 获取这个点能否移动
    * @param nextdes
    * @param isCreepin//true creep也不行
    */
    _getPosCanMove(nextdes:RoomPosition,isCreepin:boolean=true) {
        if (!nextdes) return false
        const found = nextdes.look();

        let canmove = true;
        for (let m = 0; m < found.length; m++) {
            let type = found[m]["type"];
            this.AddLog("_getPosCanMove found 333 :" + m + type, 0, found[m]);
            if (!canmove)
                break;
            switch (type) {
                case "terrain":
                    if (found[m]["terrain"] == "wall")
                        canmove = false;
                    break;
                case "structure":
                    this.AddLog("do_move  structureType found  :" + found[m]["structure"]["structureType"], 0, found[m]);
                    let structureType = found[m]["structure"]["structureType"];
                    switch (structureType) {
                        case "rampart":

                            break;
                        case "road":
                            //canmove = true;
                            break;
                        case "container":
                            //canmove = true;
                            break;

                        default:
                            canmove = false;
                            break;
                    }
                    break;
                case "constructionSite":
                    this.AddLog("do_move  constructionSite found  :" + found[m]["constructionSite"]["structureType"], 10);
                    if (found[m]["constructionSite"]["structureType"] == "road") {
                        //canmove = true;
                    }                        
                    else
                        canmove = false;

                    break;
                case "creep":
                    if (isCreepin)
                        canmove = false; 
                    break;
            }
        }
        this.AddLog("_getPosCanMove found  :"
            + canmove + nextdes.x + " " + nextdes.y + " ", 0);
        return canmove
    }

 

    AddLog(info: string, leave: number = 1,obj:any=null) {
        let self = this;
        info = this.classname + "--" + info;
        if (leave >= self.logleave) {
            if (obj) {
                if (typeof obj == "object")
                    obj = JSON.stringify(obj)
           
                    info = info + obj
            }
          
            console.log(info)
        }
    }

    getNewid(): string {
        function s4(): string {
            try {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16).substring(1);
            } catch (e) {
                console.log("getNewid err  why???")
            }
       
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    /**
    * 走到边界防卡  固定移动也需要
    * @param creep
    */
    moveMapNotOut(creep) {
        if (creep.pos.x == 0) {
            let tmp
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + 1, creep.pos.y + i, creep.room.name);
                if (!this._getPosCanMove(nextdes)) continue;
                switch (i) {
                    case -1:
                        tmp = creep.move(TOP_RIGHT)
                        this.AddLog("_outmaparea TOP_RIGHT:" + tmp, 20);
                        return true
                    case 0:
                        tmp = creep.move(RIGHT)
                        this.AddLog("_outmaparea LEFT:" + tmp, 20);
                        return true
                }
            }
            tmp = creep.move(BOTTOM_RIGHT)
            
            return true
        }
        if (creep.pos.x == 49) {
            //旁边可能不可移动
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x - 1, creep.pos.y + i, creep.room.name);
                if (!this._getPosCanMove(nextdes)) continue;
                switch (i) {
                    case -1:
                        creep.move(TOP_LEFT)

                        return true
                    case 0:
                        creep.move(LEFT)
                        return true
                }
            }
            creep.move(BOTTOM_LEFT)
            return true
        }
        if (creep.pos.y == 0) {
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + i, creep.pos.y + 1, creep.room.name);
                this.AddLog("moveMapNotOut :" + this.logleave + i, 10, nextdes);
                if (!this._getPosCanMove(nextdes)) continue;
                this.AddLog("moveMapNotOut  do it:" + this.logleave + i, 10, nextdes);
                switch (i) {
                    case -1:
                        creep.move(BOTTOM_LEFT)
                        return true
                    case 0:
                        creep.move(BOTTOM)
                        return true
                }
            }
            creep.move(BOTTOM_RIGHT)
            return true
            //creep.move(BOTTOM)
            //return true
        }
        if (creep.pos.y == 49) {
            //旁边可能不可移动
            for (var i = -1; i < 1; i++) {
                let nextdes = new RoomPosition(creep.pos.x + i, creep.pos.y - 1, creep.room.name);
                if (!this._getPosCanMove(nextdes)) continue;
                switch (i) {
                    case -1:
                        creep.move(TOP_LEFT)
                        return true
                    case 0:
                        creep.move(TOP)
                        return true
                }
            }
            creep.move(TOP_RIGHT)
            return true
        }
        return false
    }

    getNextRooms(roomname) {
        return this.defaultset["roomnext"][roomname]||[];
    }
}

Basic78.prototype.debuglogkey = "";
//Basic78.prototype.debugsourceid = ""
//Basic78.prototype.debugtargetid = ""

Basic78.prototype.refleaveTotal = 10;
Basic78.prototype.logleave = 40;
Basic78.prototype.myownname = "www778878net";

Basic78.prototype.defaultset = {
    roomnext: {//附近的房间
        "W5S48": ["W6S48", "W4S48"] 
        , "W4S48": ["W5S48", "W4S47", "W4S49", "W3S48"]   
        , "W4S47": ["W4S48"]   
        , "W4S49": ["W4S48"]   
        , "W3S48": ["W4S48"]   


        , "W6S48": ["W5S48"]  
        , "W6S47": ["W6S48", "W7S47"]  

        , "W7S47": ["W6S47" ]
        , "W7S46": ["W7S47"]
        , "W7S48": ["W7S47"]
        , "W8S47": ["W7S47", "W9S47"]
        , "W9S47": ["W8S47"]
    }
}
 