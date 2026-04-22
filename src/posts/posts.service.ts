import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User, UserRole } from 'src/auth/entities/user.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FindPostsQueryDto } from './dto/find-posts-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
@Injectable()
export class PostsService {
  private postListCachekeys: Set<string> = new Set();
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private generatePostListCacheKey(query: FindPostsQueryDto) {
    const { page = 1, limit = 10, title } = query;
    return `post_lists_page_${page}_limit_${limit}_title_${title || 'all'}`;
  }
  async findAll(query: FindPostsQueryDto): Promise<PaginatedResponse<Post>> {
    const cacheKey = this.generatePostListCacheKey(query);
    this.postListCachekeys.add(cacheKey);

    const getCachedPosts =
      await this.cacheManager.get<PaginatedResponse<Post>>(cacheKey);
    if (getCachedPosts) {
      console.log(`cache hit-------------> Returning from cache:${cacheKey}`);
      return getCachedPosts;
    }
    console.log(`cache miss-------------> Returning from db`);
    const { page = 1, limit = 10, title } = query;
    const skip = (page - 1) * limit;
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.authorName', 'authorName')
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .skip(skip);
    if (title) {
      queryBuilder.andWhere('post.title ILIKE :title', { title: `%${title}%` });
    }
    const [items, totalItems] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const response: PaginatedResponse<Post> = {
      items,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
    await this.cacheManager.set(cacheKey, response, 30000);
    return response;
  }

  async findOne(id: number): Promise<Post> {
    const cacheKey = `post_${id}`;
    const cachedPost = await this.cacheManager.get<Post>(cacheKey);
    if (cachedPost) {
      console.log(`cache hit-------------> Returning from cache:${cacheKey}`);
      return cachedPost;
    }
    console.log(`cache miss-------------> Returning from db`);
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['authorName'],
    });
    if (!post) {
      throw new NotFoundException('Post with id ' + id + ' not found');
    }
    await this.cacheManager.set(cacheKey, post, 30000);
    return post;
  }
  async create(postData: CreatePostDto, authorName: User): Promise<Post> {
    const newPost = this.postRepository.create({
      title: postData.title,
      content: postData.content,
      authorName: authorName,
    });

    await this.invalidateAllExistingPostListCaches();
    return this.postRepository.save(newPost);
  }
  async update(id: number, postData: UpdatePostDto, user: User): Promise<Post> {
    const updatedPost = await this.findOne(id);
    if (updatedPost.authorName.id !== user.id && user.role !== UserRole.ADMIN)
      throw new ForbiddenException('You are not the author of this post');
    if (postData.title) updatedPost.title = postData.title;
    if (postData.content) updatedPost.content = postData.content;
    const savedPost = await this.postRepository.save(updatedPost);
    await this.cacheManager.del(`post_${id}`);
    await this.invalidateAllExistingPostListCaches();
    return savedPost;
  }
  async remove(id: number): Promise<void> {
    const postToRemove = await this.findOne(id);
    await this.postRepository.remove(postToRemove);
    await this.cacheManager.del(`post_${id}`);
    await this.invalidateAllExistingPostListCaches();
  }
  private async invalidateAllExistingPostListCaches() {
    console.log('Invalidating all existing post list caches');
    for (const cacheKey of this.postListCachekeys) {
      await this.cacheManager.del(cacheKey);
    }
    this.postListCachekeys.clear();
  }
}
