import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}) => {
  const from = process.env.SMTP_FROM || 'noreply@example.com'

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
