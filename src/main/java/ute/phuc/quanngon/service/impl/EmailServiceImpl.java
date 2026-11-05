package ute.phuc.quanngon.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.MailException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import ute.phuc.quanngon.config.OtpProperties;
import ute.phuc.quanngon.exception.EmailSendingException;
import ute.phuc.quanngon.service.EmailService;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final OtpProperties otpProperties;

    @Value("${spring.mail.username}")
    private String sender;

    // Gửi email xác thực bằng SMTP.
    public void sendOtpMail(String email, String otp) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(sender);
            helper.setTo(email);
            helper.setSubject("Xác thực tài khoản - QuanNgon");
            helper.setText(buildOtpEmail(otp), true);

            mailSender.send(message);

        } catch (MessagingException | MailException e) {
            // Logging: chuyển nguyên nhân cho handler
            throw new EmailSendingException("Không thể gửi email OTP", e);
        }
    }

    @Override
    public void sendPasswordResetOtpMail(String email, String otp) {
        // Gửi OTP đặt lại mật khẩu, không gửi mật khẩu qua email.
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(sender);
            helper.setTo(email);
            helper.setSubject("Đặt lại mật khẩu - Quán Ngon");
            helper.setText("""
                    Bạn vừa yêu cầu đặt lại mật khẩu tài khoản Quán Ngon.

                    Mã OTP của bạn: %s

                    Mã có hiệu lực trong %d giây và chỉ sử dụng một lần.
                    Không chia sẻ mã này với bất kỳ ai.

                    Nếu bạn không thực hiện yêu cầu, hãy bỏ qua email này.
                    Mật khẩu hiện tại của bạn vẫn được giữ nguyên.
                    """.formatted(otp, otpProperties.getExpirationSeconds()));
            mailSender.send(message);
        } catch (MessagingException | MailException ex) {
            throw new EmailSendingException("Không thể gửi email đặt lại mật khẩu", ex);
        }
    }

    private String buildOtpEmail(String otp) {

        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                </head>

                <body style="
                    margin: 0;
                    padding: 0;
                    background-color: #fff9f7;
                    font-family: Arial, Helvetica, sans-serif;
                ">

                    <div style="
                        max-width: 600px;
                        margin: 40px auto;
                        background-color: #ffffff;
                        border-radius: 24px;
                        padding: 45px 40px;
                        text-align: center;
                        box-shadow: 0 8px 30px rgba(120, 60, 40, 0.08);
                    ">

                        <div style="
                            font-size: 26px;
                            font-weight: 700;
                            color: #a52d2d;
                            margin-bottom: 30px;
                        ">
                            QuanNgon
                        </div>

                        <h1 style="
                            margin: 0;
                            font-size: 30px;
                            color: #a52d2d;
                        ">
                            Xác thực tài khoản
                        </h1>

                        <p style="
                            margin: 12px 0 30px;
                            font-size: 17px;
                            color: #9a8981;
                        ">
                            Sử dụng mã OTP bên dưới để xác thực tài khoản
                        </p>

                        <div style="
                            display: inline-block;
                            background-color: #fff3ee;
                            border: 2px solid #ff5722;
                            border-radius: 14px;
                            padding: 16px 30px;
                        ">
                            <span style="
                                font-size: 34px;
                                font-weight: 700;
                                letter-spacing: 10px;
                                color: #a52d2d;
                            ">
                                %s
                            </span>
                        </div>

                        <p style="
                            margin: 25px 0;
                            font-size: 15px;
                            color: #ff5722;
                            font-weight: 600;
                        ">
                            Mã có hiệu lực trong %d phút
                        </p>

                        <div style="
                            background-color: #faf7f5;
                            border-radius: 12px;
                            padding: 15px 20px;
                        ">
                            <p style="
                                margin: 0;
                                font-size: 14px;
                                line-height: 1.6;
                                color: #8d7d76;
                            ">
                                Không chia sẻ mã OTP này với bất kỳ ai.
                                <br>
                                Nếu bạn không thực hiện đăng ký tài khoản,
                                vui lòng bỏ qua email này.
                            </p>
                        </div>

                        <div style="
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #eee5e1;
                        ">
                            <p style="
                                margin: 0;
                                font-size: 13px;
                                color: #a99a94;
                            ">
                                © 2026 QuanNgon
                            </p>
                        </div>

                    </div>

                </body>
                </html>
                """.formatted(
                otp,
                otpProperties.getExpirationSeconds() / 60
        );
    }


}
