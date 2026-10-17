import { Body, Controller, Get, HttpCode, Patch, Post } from "@nestjs/common";
import {
  ChangePasswordDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterCustomerDTO,
  RegisterMerchantDTO,
  UpdateProfileDTO,
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerCustomerSchema,
  registerMerchantSchema,
  updateProfileSchema,
} from "@tranche/shared";
import { CurrentUser, Public, ResponseMessage } from "@/common/decorators";
import { zod } from "@/common/pipes/zod-validation.pipe";
import type { User } from "@/database/entities";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ResponseMessage("Welcome to Tranche")
  register(@Body(zod(registerCustomerSchema)) dto: RegisterCustomerDTO) {
    return this.authService.registerCustomer(dto);
  }

  @Public()
  @Post("register/merchant")
  @ResponseMessage("Merchant account created. We'll review it shortly.")
  registerMerchant(@Body(zod(registerMerchantSchema)) dto: RegisterMerchantDTO) {
    return this.authService.registerMerchant(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body(zod(loginSchema)) dto: LoginDTO) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body(zod(refreshTokenSchema)) dto: RefreshTokenDTO) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  logout(@Body() body: { refreshToken?: string }) {
    return this.authService.logout(typeof body?.refreshToken === "string" ? body.refreshToken : undefined);
  }

  @Get("me")
  me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: User, @Body(zod(updateProfileSchema)) dto: UpdateProfileDTO) {
    return this.authService.updateProfile(user, dto);
  }

  @Post("change-password")
  @HttpCode(200)
  @ResponseMessage("Password changed. Other devices have been signed out.")
  changePassword(@CurrentUser() user: User, @Body(zod(changePasswordSchema)) dto: ChangePasswordDTO) {
    return this.authService.changePassword(user, dto);
  }
}
