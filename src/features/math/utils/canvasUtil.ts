export class CanvasUtil {
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not get 2D context");
        }
        this.ctx = context;
    }

    clearCanvas(width: number, height: number): void {
        this.ctx.clearRect(0, 0, width, height);
    }

    setLineStyle(color: string, width: number, dashPattern: number[] = []): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.setLineDash(dashPattern);
    }

    drawLine(x1: number, y1: number, x2: number, y2: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawCircle(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.stroke();
    }

    drawPolygon(points: { x: number; y: number }[]): void {
        this.ctx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.closePath();
        this.ctx.stroke();
    }
}