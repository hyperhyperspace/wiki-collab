import {
  ClassRegistry,
  Hash,
  HashedObject,
  Identity,
  MutableReference,
} from "@hyper-hyper-space/core";

import { BlockType } from "..";
import { PageBlockArray } from "./PageBlockArray";
import { Block } from "./Block";
import { PermissionLogic } from "./PermissionLogic";

class Page extends HashedObject {
  static className = "hhs-wiki/v0/Page";

  permissionLogic?: PermissionLogic;
  wikiHash?: Hash;
  name?: MutableReference<string>;
  blocks?: PageBlockArray;
  titleBlock?: Block;

  constructor(name?: string, permissionLogic?: PermissionLogic, wikiHash?: Hash) {
    super();
    
    // FIXME: we're not checking that the received permissionLogic matches the wiki
    //        that hashes to wikiHash. Possible solution: change wikiHash to 
    //        wiki: HashReference<Wiki>, and receive the actual wiki object as param.
    //        (then we can have the wiki available again for validation).

    if (permissionLogic !== undefined && wikiHash !== undefined) {

      if (!(permissionLogic instanceof PermissionLogic)) {
        throw new Error('Trying to create a wiki page, but the received PermissionLogic object has the wrong type.');
      }

      if (typeof(wikiHash) !== 'string') {
        throw new Error('Trying to create a wiki page, but the received wiki hash has the wrong type.');
      }

      this.setRandomId();
      this.permissionLogic = permissionLogic;
      this.wikiHash = wikiHash
      this.addDerivedField('name', new MutableReference<string>());
      this.addDerivedField('blocks', new PageBlockArray(permissionLogic));
      this.addDerivedField('titleBlock', new Block());
    }

    if (name !== undefined) {
      this.name?.setValue(name);
    }
  }

  setAuthor(author: Identity) {
    super.setAuthor(author);
  }

  async addBlock(idx?: number, type?: BlockType, author?: Identity) {

    const block = await this.addBlockNoSave(idx, type, author);
    
    await this.blocks?.saveQueuedOps();
    
    return block;
  }

  async addBlockNoSave(idx?: number, type?: BlockType, author?: Identity) {

    const block = new Block(type, this.permissionLogic);
    
    if (this.hasResources()) {
      block.setResources(this.getResources()!);
    }

    if (idx === undefined) {
      await this.blocks?.push(block, author);
    } else {
      await this.blocks?.insertAt(block, idx, author);
    }
    
    return block;
  }
  
  async moveBlock(from: number, to: number, author?: Identity) {
    console.log('moving block from', from, 'to', to)
    const block = this.blocks?.valueAt(from);
    if (block) {
        //await this.blocks?.deleteAt(from); // shouldn't need this - I think we don't!
        await this.blocks?.insertAt(block, to, author);
        await this.blocks?.save();
        return to
    } else {
      return from
    }
  }

  async removeBlock(block: Block, author?: Identity) {
    this.blocks?.deleteElement(block, author);
    this.blocks?.save();
  }

  canUpdate(author?: Identity) {
      return this.permissionLogic?.createUpdateAuthorizer(author).attempt();
  }

  getClassName(): string {
    return Page.className;
  }

  init(): void {}

  async validate(_references: Map<string, HashedObject>): Promise<boolean> {
    if (this.permissionLogic === undefined) {
        return false;
    }

    if (this.wikiHash === undefined) {
        return false;
    }

    if (this.permissionLogic === undefined) {
        return false;
    }

    const another = new Page(undefined, this.permissionLogic, this.wikiHash);
    another.setId(this.getId() as string);
    if (this.hasAuthor()) {
        another.setAuthor(this.getAuthor() as Identity);
    }

    return this.equals(another);
  }
}

ClassRegistry.register(Page.className, Page);

export { Page };
