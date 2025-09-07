import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../user/user.schema';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).exec();
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    
    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: user.role,
      name: user.fullName 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isActive: user.isActive,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.userModel.findOne({ email: registerDto.email }).exec();
    if (existingUser) {
      throw new UnauthorizedException('Email đã được sử dụng');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Tạo user mới
    const newUser = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      isActive: true,
    });

    const savedUser = await newUser.save();
    const { password, ...result } = savedUser.toObject();

    return result;
  }

  async findUserById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  // Kiểm tra quyền truy cập theo role
  hasPermission(userRole: string, requiredPermissions: string[]): boolean {
    const rolePermissions = {
      'Director': [
        'users', 'products', 'orders', 'delivery-status', 'production-status',
        'ad-accounts', 'ad-groups', 'advertising-costs', 'quotes',
        'product-categories', 'order-status', 'labor-costs', 'other-costs',
        'salary-config', 'reports', 'export', 'import'
      ],
      'Manager': [
        'ad-accounts', 'ad-groups', 'advertising-costs', 'quotes',
        'reports', 'export', 'products', 'product-categories'
      ],
      'Employee': [
        'orders', 'delivery-status', 'production-status', 'order-status',
        'products', 'product-categories'
      ],
      'Internal Agent': ['orders', 'delivery-status', 'products'],
      'External Agent': ['orders', 'delivery-status'],
      'Internal Supplier': ['products', 'quotes'],
      'External Supplier': ['quotes'],
    };

    const userPermissions = rolePermissions[userRole] || [];
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
