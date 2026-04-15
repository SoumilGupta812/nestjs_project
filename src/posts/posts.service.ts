import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}
  async findAll(): Promise<Post[]> {
    return this.postRepository.find();
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post with id ' + id + ' not found');
    }
    return post;
  }
  async create(postData: CreatePostDto): Promise<Post> {
    const newPost = this.postRepository.create({
      title: postData.title,
      content: postData.content,
      authorName: postData.authorName,
    });
    return this.postRepository.save(newPost);
  }
  async update(id: number, postData: UpdatePostDto): Promise<Post> {
    const updatedPost = await this.findOne(id);
    if (postData.title) updatedPost.title = postData.title;
    if (postData.content) updatedPost.content = postData.content;
    if (postData.authorName) updatedPost.authorName = postData.authorName;
    return this.postRepository.save(updatedPost);
  }
  async remove(id: number): Promise<void> {
    const postToRemove = await this.findOne(id);
    await this.postRepository.remove(postToRemove);
  }
}
